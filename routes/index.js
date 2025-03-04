const express = require('express');
const path = require('path');
const forge = require('node-forge');
const axios = require('axios');

const indexController = require('../controllers/indexController');
const uploadController = require('../controllers/uploadController');
const Request = require('../models/Request');
const KycData = require('../models/KycData');
const CompletedKyc = require('../models/CompletedKyc');
const VerificationRequest = require('../models/VerificationRequest');
const PublicKey = require('../models/PublicKey');
const pendingRequestController = require('../controllers/pendingRequestController');
const emailController = require('../controllers/emailController');
const qrmailer = require('../controllers/qrmailer');

const url = 'http://localhost:8000/';

const router = express.Router();

/* GET home page. */
router.get('/', indexController.index);

router.post('/uploadDocument', uploadController.upload);

router.get('/download/:file', (req, res) => {
  const { file } = req.params;
  if (file == undefined || file == '') {
    return res.json({ success: false, message: 'File name cannot be null/empty' });
  }
  const fileLocation = path.join('./uploads', file);
  res.download(fileLocation, file);
});

router.post('/verify', (request, res) => {
  console.log(request.body);
  if (request.body.verifierAddress == undefined || request.body.verifierAddress == '') {
    return res.status(400).json({ success: false, message: 'Verifier Address cannot be empty' });
  }
  if (request.body.userId == undefined || request.body.userId == '') {
    return res.status(400).json({ success: false, message: 'UserId cannot be empty' });
  }
  if (request.body.originalData == undefined || request.body.originalData == '') {
    return res.status(400).json({ success: false, message: 'Original Data cannot be empty' });
  }
  if (request.body.userPublicKey == undefined || request.body.userPublicKey == '') {
    return res.status(400).json({ success: false, message: 'User Public Key cannot be empty' });
  }
  KycData.find({verifierAddress: request.body.verifierAddress, userId: request.body.userId},(err,docs)=>{
    if(err){
      return res.status(403).json({success:false,message:"Database error"})
    }
    else if(docs.length!=0){
      return res.status(200).json({ success: true, message: 'verified' });
    }
    else{
      const kycData = new KycData({
        verifierAddress: request.body.verifierAddress, userId: request.body.userId, data: request.body.originalData, userPublicKey: request.body.userPublicKey,
      });
      kycData.save((error, data) => {
        if (error) return res.status(500).json({ success: false, message: 'Error saving to Database', error });
        else {
          return res.status(200).json({ success: true, message: 'verified' });
        }
      });
    }
  })
});

router.post('/publicKey', (req, res) => {
  const {verifierAddress, publicKey} = req.body;
  if (verifierAddress == undefined || verifierAddress == '') {
    return res.status(400).json({ success: false, message: 'verifier address cannot be empty' });
  }
  if (publicKey == undefined || publicKey == '') {
    return res.status(400).json({ success: false, message: 'public key cannot be empty' });
  }
  const pKey = new PublicKey({verifierAddress,publicKey});
  pKey.save((error, data) => {
    if (error) return res.status(500).json({ success: false, message: 'Error saving to Database', error });
    else {
      return res.status(200).json({ success: true, message: 'saved' });
    }
  });
});

router.get('/publicKey', (req, res) => {
  const { verifierAddress } = req.params;
  if (verifierAddress == undefined || verifierAddress == '') {
    return res.json({ success: false, message: 'verifier address cannot be null/empty' });
  }
  PublicKey.find({verifierAddress},(err,docs)=>{
    if(err) return res.status(400).json({success:false, message:"Error finidng data"})
    else{
      return res.status(200).json({success:true, data:docs});
    }
  })
});

router.post('/publicKeyArray', (req, res) => {
  const { verifiersList } = req.body;
  console.log(verifiersList)
  if (verifiersList == undefined) {
    return res.status(400).json({ success: false, message: 'customer list cannot be empty' });
  }
  else if(verifiersList == ''){
    return res.status(200).json({success:true, data:[]});
  }
  var verifiersArray= verifiersList.split("#")
  console.log(verifiersArray)
  var query =[]
  for(var i=0;i<verifiersArray.length;i++){
    var json ={
      verifierAddress:verifiersArray[i]
    }
    query.push(json)
  }
  console.log(query)
  PublicKey.find({$or:query }, (error, data) => {
    if (error) res.status(500).json({ success: false, message: 'Error finding data from database', error });
    else res.status(200).json({ success: true, data });
  });
});

router.post('/request/delete', (req, res) => {
  if (req.body._id == undefined || req.body._id == '') {
    return res.status(400).json({ success: false, message: '_id cannot be empty' });
  }
  const { _id } = req.body;
  console.log(req.body._id);
  Request.deleteOne({ _id }, (error) => {
    if (error)return res.status(500).json({ success: false, message: 'Error deleting from database', error });
    else return res.status(200).json({ success: true });
  });
});

router.post('/completedKyc/delete', (req, res) => {
  if (req.body._id == undefined || req.body._id == '') {
    return res.status(400).json({ success: false, message: '_id cannot be empty' });
  }
  const { _id } = req.body;
  console.log(req.body._id);
  CompletedKyc.deleteOne({ _id }, (error) => {
    if (error)return res.status(500).json({ success: false, message: 'Error deleting from database', error });
    else return res.status(200).json({ success: true });
  });
});

router.post('/completedKyc', (req, res) => {
  const { verifierAddress } = req.body;
  if (verifierAddress == undefined || verifierAddress == '') {
    return res.status(400).json({ success: false, message: 'Verifier Address cannot be empty' });
  }
  CompletedKyc.find({ verifierAddress }, (error, data) => {
    if (error) res.status(500).json({ success: false, message: 'Error finding data from database', error });
    else res.status(200).json({ success: true, data });
  });
});

router.get('/kycData', (req, res) => {
  const { verifierAddress } = req.query;
  if (verifierAddress == undefined || verifierAddress == '') {
    return res.status(400).json({ success: false, message: 'Verifier Address cannot be empty' });
  }
  KycData.find({ verifierAddress }, (error, data) => {
    if (error) res.status(500).json({ success: false, message: 'Error finding data from database', error });
    else res.status(200).json({ success: true, data });
  });
});

router.post('/kycData2', (req, res) => {
  const { customerList } = req.body;
  console.log(customerList)
  if (customerList == undefined) {
    return res.status(400).json({ success: false, message: 'customer list cannot be empty' });
  }
  else if(customerList == ''){
    return res.status(200).json({success:true, data:[]});
  }
  var customerArray= customerList.split("#")
  console.log(customerArray)
  var query =[]
  for(var i=0;i<customerArray.length;i++){
    var json ={
      userId:customerArray[i]
    }
    query.push(json)
  }
  console.log(query)
  KycData.find({$or:query }, (error, data) => {
    if (error) res.status(500).json({ success: false, message: 'Error finding data from database', error });
    else res.status(200).json({ success: true, data });
  });
});

router.post('/updateKyc', (req, res) => {
  const { newData, userId } = req.body;
  if (newData == undefined || newData == '') {
    return res.status(400).json({ success: false, message: 'user data cannot be empty' });
  }
  if (userId == undefined || userId == '') {
    return res.status(400).json({ success: false, message: 'user id cannot be empty' });
  }
  const conditions = { userId };
  const update = {
    $set: {
      data: newData,
    },
  };
  const options = { multi: true, upsert: true };

  // update_many :)
  KycData.updateMany(

    conditions, update, options, (err, doc) => {
      console.log(req.body);
      if (!err) {
        res.status(200).json({ success: true, message: 'KYC data updated' });
      } else {
        return res.status(400).json({ success: false, message: 'Failed to update' });
      }
    },
  );
});


router.get('/getPendingRequest', pendingRequestController.getPending);

router.post('/mailQR', qrmailer.qr);

router.post('/verifyOTP', (req, res) => {
  const { _id, otp, originalData } = req.body;
  if (_id == undefined || _id == '') {
    return res.status(400).json({ success: false, message: '_id cannot be empty' });
  }
  if (otp == undefined || otp == '') {
    return res.status(400).json({ success: false, message: 'otp cannot be empty' });
  }
  if (originalData == undefined || originalData == '') {
    return res.status(400).json({ success: false, message: 'data cannot be empty' });
  }
  VerificationRequest.find({ _id }, (err, requests) => {
    // console.log(requests)
    if (err || requests.length == 0) return res.json({ success: false, message: 'Could not locate reuqest', err });
    const request = requests[0];
    if (request.otp == otp) {
      const email = request.email;
      console.log();
      const publicKey = forge.pki.publicKeyFromPem(request.verifierPublicKey);
      console.log('otp verified');
      const md = forge.md.sha1.create();
      md.update(originalData, 'utf8');
      try {
        var verified = publicKey.verify(md.digest().bytes(), forge.util.decode64(request.signature));
      } catch (e) {
        return res.status(401).json({ success: false, message: 'Mismatched Keys', e });
      }
      if (verified == true) {
        var encryptedCid=''
        // console.log(originalData)
        PublicKey.find({verifierAddress:request.verifierAddress},(err,docs)=>{
          if (err) return res.status(500).json({ success: false, message: 'Error saving to Db' });
          else{
            // console.log(docs[0])
            var pKey=docs[0].publicKey;
            pKey = forge.pki.publicKeyFromPem(pKey);
            // console.log(pKey)
            try{
              encryptedCid = pKey.encrypt(originalData)
            }
            catch (e){
              return res.status(400).json({success:false, message:"Public key from mongo error"})
            }
            encryptedCid = forge.util.encode64(encryptedCid)
            // console.log(encryptedCid)
            const completedKyc = new CompletedKyc({
              verifierAddress:request.verifierAddress, userId:request.userId, encryptedCid:encryptedCid, mode:2
            });
            completedKyc.save((err,data)=>{
              if(err) return res.status(500).json({ success: false, message: 'Error saving to Db' });
            });
            
            VerificationRequest.findByIdAndDelete(_id, (error) => {
              if (error)
              return res.status(500).json({ success: false });
              else{
                const data = `Your KYC request is complete. You are now registered with ${request.bankName}.`;
                const body = {
                  email,
                  data,
                };
                axios.post(`${url}sendMail`, body)
                return res.json({ success: true, message: 'Kyc Completed' });
              }
            });
          }
        })
      } 
      else {
        return res.status(401).json({ success: false, message: 'Invalid data' });
      }
    } else {
      return res.status(401).json({ success: false, message: 'Invalid Otp' });
    }
  });
});

router.post('/pushCompletedKyc', (req, res)=>{
  var {completedKyc} = req.body;
  console.log(completedKyc)
  // completedKyc = JSON.parse(completedKyc)  
  if(completedKyc==undefined || completedKyc == "")
    return res.status(400).json({sucess:false, message:"empty body"});
  else{
      CompletedKyc.insertMany(completedKyc,(err,docs)=>{
        if(err) return res.status(400).json({success:false, message:"error", err})
        else return res.status(200).json({success:true, message:"done"})
      });
      
    }
  })

router.post('/sendMail', emailController.email);

router.post('/initiateVerification', (req, res) => {
  const {
    otp, verifierAddress, userId, userPublicKey, verifierPublicKey, signature, email, _id, encryptedData, bankName
  } = req.body;
  if (_id == undefined || _id == '') {
    return res.status(400).json({ success: false, message: '_id cannot be empty' });
  }
  if (otp == undefined || otp == '') {
    return res.status(400).json({ success: false, message: 'otp cannot be empty' });
  } if (verifierAddress == undefined || verifierAddress == '') {
    return res.status(400).json({ success: false, message: 'verifier address cannot be empty' });
  } if (userId == undefined || userId == '') {
    return res.status(400).json({ success: false, message: 'user Id cannot be empty' });
  } if (userPublicKey == undefined || userPublicKey == '') {
    return res.status(400).json({ success: false, message: 'user Public key cannot be empty' });
  } if (verifierPublicKey == undefined || verifierPublicKey == '') {
    return res.status(400).json({ success: false, message: 'verifier public key annot be empty' });
  } if (signature == undefined || signature == '') {
    return res.status(400).json({ success: false, message: 'signature cannot be empty' });
  } if (email == undefined || email == '') {
    return res.status(400).json({ success: false, message: 'email cannot be empty' });
  }
  if (encryptedData == undefined || encryptedData == '') {
    return res.status(400).json({ success: false, message: 'encrypted data cannot be empty' });
  }
  const newRequest = new VerificationRequest({
    verifierAddress, verifierPublicKey, userId, otp, signature, email, bankName
  });
  newRequest.save((error, request) => {
    if (error) return res.status(500).json({ success: false, error, message: 'Error saving new request' });

    // console.log(userPublicKey)
    try {
      const plaintextBytes = forge.util.encodeUtf8(otp);
      const publicKey = forge.pki.publicKeyFromPem(userPublicKey);
      var encryptedOtp = publicKey.encrypt(plaintextBytes);
    } catch (e) {
      console.log(e);
      alert('cannot encrypt');
      return res.status(400).json({ success: false, message: e });
    }
    encryptedOtp = forge.util.encode64(encryptedOtp);
    const data = `Your verification request number: ${request._id}\n\n This is the otp:\n\n${encryptedOtp}\n\n This is the encrypted data format of your KYC data:\n\n${encryptedData}\n\n Please decrypt with your private key for two factor authorisation.\n\n`;
    console.log(data);
    const body = {
      email,
      data,
    };
    console.log(_id);
    axios.post(`${url}sendMail`, body).then((response) => {
      if (response.data.success === true) {
        const bd = {
          _id,
        };
        console.log(bd);
        Request.deleteOne({ _id }, (err) => {
          if (err) return res.status(500).json({ success: false, message: 'Error deleting from database', error });
          return res.status(200).json({ success: true, message: 'OTP generated and mailed' });
        });
      } else {
        return res.json({ success: false, message: 'Could not send email' });
      }
    });
  });
});

module.exports = router;
