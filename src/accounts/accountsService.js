const { omit } = require('lodash');
const cloudinary = require('cloudinary').v2;
const { cloudinary: cloudinaryConfig } = require('../../config');
const { Account, ...Model } = require('../../model');
const { NotFoundError, UnAuthorizedError } = require('../../utils/customError');
const { verifyPassword } = require('../../utils/helper');

const { validateCredentials } = require('../../utils/helper');
cloudinary.config({
  cloud_name: cloudinaryConfig.name,
  api_key: cloudinaryConfig.key,
  api_secret: cloudinaryConfig.secret,
});

async function accountExists(email) {
  const account = await Account.findOne({ email });

  if (account) {
    return true;
  }

  return false;
}

async function updatePassword(userId, oldPassword, newPassword) {
  let user = await Account.findOne(userId).select('+password');

  const check = await verifyPassword(oldPassword, user.password);
  if (!check) {
    throw new UnAuthorizedError();
  }

  user.password = newPassword;
  await user.save();
  user = omit(user.toObject(), ['password']);
  return user;
}

async function getAccounts(filters) {
  const accountType = filters.category ? { accountType: filters.category } : {};
  const accounts = await Account.find(accountType).populate('owner');

  return accounts;
}

async function getSingleAccount(id) {
  const account = await Account.findById(id).populate('owner');

  return account;
}

async function updateAccount({ id, payload }) {
  const account = await Account.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
    context: 'query',
  }).populate('owner');

  return account;
}

async function deleteAccount({ id, password }) {
  try {
    let account = await Account.findById(id).populate('owner');
    if (!account) {
      throw new NotFoundError('Account not found!');
    }
    let deletedAccount = await validateCredentials(account.email, password);
    if (!deletedAccount) {
      throw new UnAuthorizedError('Incorrect Password!');
    }

    account.isDeleted = true;
    account.save();

    return account;
  } catch (error) {
    return error;
  }
}

async function createAccount({ category, altSchoolId, ...payload }) {
  const obj = (altSchoolId && { altSchoolId }) || {};
  const { _id: owner } = await Model[category].create(obj);
  const account = await Account.create({
    ...payload,
    owner,
    accountType: category,
  });
  await account.populate('owner');
  return account;
}

async function uploadProfilePicture({ id, image }) {
  try {
    const account = await Account.findById(id);
    if (!account) {
      const error = new NotFoundError('Account not found!');
      return error;
    }

    const cloudinaryUpload = await cloudinary.uploader.upload(image, {
      public_id: `${cloudinaryConfig.folder}/images/profile-pictures/${id}`,
    });

    account.profilePicture = cloudinaryUpload.secure_url;
    await account.save();

    return account;
  } catch (error) {
    return error;
  }
}

async function deleteProfilePicture(id) {
  try {
    const account = await Account.findById(id);
    if (!account) {
      const error = new NotFoundError('Account not found!');
      return error;
    }

    // eslint-disable-next-line no-unused-vars
    const cloudinaryUpload = await cloudinary.uploader.destroy(
      `${cloudinaryConfig.folder}/images/profile-pictures/${id}`
    );

    // delete profile picture from database
    account.profilePicture = '';
    await account.save();
  } catch (error) {
    return error;
  }
}

module.exports = {
  accountExists,
  createAccount,
  getAccounts,
  getSingleAccount,
  updateAccount,
  uploadProfilePicture,
  deleteProfilePicture,
  deleteAccount,
  updatePassword,
};
