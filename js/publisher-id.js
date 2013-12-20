/**
 * Copyright (C) 2013 Regents of the University of California.
 * @author: Meki Cheraoui
 * See COPYING for copyright and distribution information.
 * This class represents Publisher and PublisherType Objects
 */

var NDNProtocolDTags = require('./util/ndn-protoco-id-tags.js').NDNProtocolDTags;
var NDNProtocolDTagsStrings = require('./util/ndn-protoco-id-tags.js').NDNProtocolDTagsStrings;

/**
 * @constructor
 */
var PublisherType = function PublisherType(tag) 
{
  this.KEY = NDNProtocolDTags.PublisherPublicKeyDigest;
  this.CERTIFICATE = NDNProtocolDTags.PublisherCertificateDigest;
  this.ISSUER_KEY = NDNProtocolDTags.PublisherIssuerKeyDigest;
  this.ISSUER_CERTIFICATE = NDNProtocolDTags.PublisherIssuerCertificateDigest;

  this.Tag = tag;
}; 

/**
 * @constructor
 */
var PublisherID = function PublisherID() 
{
  this.PUBLISHER_ID_DIGEST_ALGORITHM = "SHA-256";
  this.PUBLISHER_ID_LEN = 256/8;
    
  //TODO, implement publisherID creation and key creation

  //TODO implement generatePublicKeyDigest
  this.publisherID =null;//= generatePublicKeyDigest(key);//ByteArray
    
  //TODO implement generate key
  //CryptoUtil.generateKeyID(PUBLISHER_ID_DIGEST_ALGORITHM, key);
  this.publisherType = null;//isIssuer ? PublisherType.ISSUER_KEY : PublisherType.KEY;//publisher Type   
};

exports.PublisherID = PublisherID;

PublisherID.prototype.from_ndnb = function(decoder) 
{    
  // We have a choice here of one of 4 binary element types.
  var nextTag = PublisherID.peekAndGetNextDTag(decoder);
    
  this.publisherType = new PublisherType(nextTag); 
    
  if (nextTag < 0)
    throw new Error("Invalid publisher ID, got unexpected type");

  this.publisherID = decoder.readBinaryDTagElement(nextTag);
  if (null == this.publisherID)
    throw new ContentDecodingException(new Error("Cannot parse publisher ID of type : " + nextTag + "."));
};

PublisherID.prototype.to_ndnb = function(encoder) 
{
  if (!this.validate())
    throw new Error("Cannot encode " + this.getClass().getName() + ": field values missing.");

  encoder.writeDTagElement(this.getElementLabel(), this.publisherID);
};

/**
 * Peek the next DTag in the decoder and return it if it is a PublisherID DTag.
 * @param {BinaryXMLDecoder} decoder The BinaryXMLDecoder with the input to decode.
 * @returns {number} The PublisherID DTag or -1 if it is not one of them.
 */
PublisherID.peekAndGetNextDTag = function(decoder) 
{
  if (decoder.peekDTag(NDNProtocolDTags.PublisherPublicKeyDigest))
    return             NDNProtocolDTags.PublisherPublicKeyDigest;
  if (decoder.peekDTag(NDNProtocolDTags.PublisherCertificateDigest))
    return             NDNProtocolDTags.PublisherCertificateDigest;
  if (decoder.peekDTag(NDNProtocolDTags.PublisherIssuerKeyDigest))
    return             NDNProtocolDTags.PublisherIssuerKeyDigest;
  if (decoder.peekDTag(NDNProtocolDTags.PublisherIssuerCertificateDigest))
    return             NDNProtocolDTags.PublisherIssuerCertificateDigest;
  
  return -1;
};
  
PublisherID.peek = function(/* XMLDecoder */ decoder) 
{
  return PublisherID.peekAndGetNextDTag(decoder) >= 0;
};

PublisherID.prototype.getElementLabel = function()
{ 
  return this.publisherType.Tag;
};

PublisherID.prototype.validate = function() 
{
  return null != id() && null != type();
};