/**
 * Copyright (C) 2017 Regents of the University of California.
 * @author: Jeff Thompson <jefft0@remap.ucla.edu>
 * @author: From ndn-cxx security https://github.com/named-data/ndn-cxx/blob/master/src/security/verification-helpers.cpp
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * A copy of the GNU Lesser General Public License is in the file COPYING.
 */

/** @ignore */
var Crypto = require('../crypto.js'); /** @ignore */
var SyncPromise = require('../util/sync-promise.js').SyncPromise; /** @ignore */
var Blob = require('../util/blob.js').Blob; /** @ignore */
var KeyType = require('./security-types.js').KeyType; /** @ignore */
var UseSubtleCrypto = require("../use-subtle-crypto-node.js").UseSubtleCrypto; /** @ignore */
var DigestAlgorithm = require('./security-types.js').DigestAlgorithm; /** @ignore */
var PublicKey = require('./certificate/public-key.js').PublicKey;

/**
 * The VerificationHelpers class has static methods to verify signatures and
 * digests.
 */
var VerificationHelpers = function VerificationHelpers() {};

exports.VerificationHelpers = VerificationHelpers;

/**
 * Verify the buffer against the signature using the public key.
 * @param {Buffer|Blob} buffer The input buffer to verify.
 * @param {Buffer|Blob} signature The signature bytes.
 * @param {PublicKey|Buffer:Blob} publicKey The object containing the public key,
 * or the public key DER which is used to make the PublicKey object.
 * @param {number} digestAlgorithm (optional) The digest algorithm as an int
 * from the DigestAlgorithm enum. If omitted, use DigestAlgorithm.SHA256.
 * @param {boolean} useSync (optional) If true then return a SyncPromise which
 * is already fulfilled. If omitted or false, this may return a SyncPromise or
 * an async Promise.
 * @return {Promise|SyncPromise} A promise which returns true if verification
 * succeeds, false if verification fails, or a promise rejected with Error for
 * an invalid public key type or digestAlgorithm.
 */
VerificationHelpers.verifySignaturePromise = function
  (buffer, signature, publicKey, digestAlgorithm, useSync)
{
  if (typeof digestAlgorithm === 'boolean') {
    // digestAlgorithm is omitted, so shift.
    useSync = digestAlgorithm;
    digestAlgorithm = undefined;
  }

  if (buffer instanceof Blob)
    buffer = buffer.buf();
  if (signature instanceof Blob)
    signature = signature.buf();
  if (!(publicKey instanceof PublicKey)) {
    // Turn publicKey into a PublicKey object.
    try {
      if (!(publicKey instanceof Blob))
        publicKey = new Blob(publicKey);
      publicKey = new PublicKey(publicKey);
    } catch (ex) {
      return SyncPromise.reject(new Error
        ("verifySignature: Error decoding public key DER: " + ex));
    }
  }
  if (digestAlgorithm == undefined)
    digestAlgorithm = DigestAlgorithm.SHA256;

  if (digestAlgorithm == DigestAlgorithm.SHA256) {
    if (publicKey.getKeyType() == KeyType.RSA) {
      if (UseSubtleCrypto() && !useSync) {
        var algo = {name:"RSASSA-PKCS1-v1_5", hash:{name:"SHA-256"}};

        return crypto.subtle.importKey
          ("spki", publicKey.getKeyDer().buf().buffer, algo, true, ["verify"])
        .then(function(key) {
          return crypto.subtle.verify(algo, key, signature, buffer)
        });
      }
      else {
        try {
          if (VerificationHelpers.verifyUsesString_ === null)
            VerificationHelpers.setVerifyUsesString_();

          // The crypto verifier requires a PEM-encoded public key.
          var keyBase64 = publicKey.getKeyDer().buf().toString('base64');
          var keyPem = "-----BEGIN PUBLIC KEY-----\n";
          for (var i = 0; i < keyBase64.length; i += 64)
            keyPem += (keyBase64.substr(i, 64) + "\n");
          keyPem += "-----END PUBLIC KEY-----";

          var verifier = Crypto.createVerify('RSA-SHA256');
          verifier.update(buffer);
          var signatureBytes = VerificationHelpers.verifyUsesString_ ?
            signature.toString('binary') : signature;
          return SyncPromise.resolve(verifier.verify(keyPem, signatureBytes));
        } catch (ex) {
          return SyncPromise.reject(new Error
            ("verifySignature: Error is RSA verify: " + ex));
        }
      }
    }
    else if (publicKey.getKeyType() == KeyType.ECDSA) {
      try {
        if (VerificationHelpers.verifyUsesString_ === null)
          VerificationHelpers.setVerifyUsesString_();

        // The crypto verifier requires a PEM-encoded public key.
        var keyBase64 =  publicKey.getKeyDer().buf().toString("base64");
        var keyPem = "-----BEGIN PUBLIC KEY-----\n";
        for (var i = 0; i < keyBase64.length; i += 64)
          keyPem += (keyBase64.substr(i, 64) + "\n");
        keyPem += "-----END PUBLIC KEY-----";

        // Just create a "sha256". The Crypto library will infer ECDSA from the key.
        var verifier = Crypto.createVerify("sha256");
        verifier.update(buffer);
        var signatureBytes = VerificationHelpers.verifyUsesString_ ?
          signature.toString('binary') : signature;
        return SyncPromise.resolve(verifier.verify(keyPem, signatureBytes));
      } catch (ex) {
        return SyncPromise.reject(new Error
          ("verifySignature: Error is ECDSA verify: " + ex));
      }
    }
    else
      return SyncPromise.reject(new Error("verifySignature: Invalid key type"));
  }
  else
    return SyncPromise.reject(new Error
      ("verifySignature: Invalid digest algorithm"));
};

// The first time verify is called, it sets this to determine if a signature
// buffer needs to be converted to a string for the crypto verifier.
VerificationHelpers.verifyUsesString_ = null;
VerificationHelpers.setVerifyUsesString_ = function()
{
  var hashResult = Crypto.createHash('sha256').digest();
  // If the hash result is a string, we assume that this is a version of
  //   crypto where verify also uses a string signature.
  VerificationHelpers.verifyUsesString_ = (typeof hashResult === 'string');
};
