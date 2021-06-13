import mongoose from 'mongoose';
import TenantUserSchema from './schemas/tenantUserSchema';
const Schema = mongoose.Schema;

export default (database) => {
  try {
    return database.model('user');
  } catch (error) {
  } 

  const UserSchema = new Schema(
    {
      fullName: { type: String, maxlength: 255 },
      firstName: { type: String, maxlength: 80 },
      lastName: { type: String, maxlength: 175 },
      /*
      unique email
      */
      email: {
        type: String,
        maxlength: 255,
        index: { unique: true },
        required: true
      },
      /*
      password values not accessible
      won't be loaded from the database at all
      */
      password: {
        type: String,
        maxlength: 255,
        select: false,
      },
      emailVerified: { type: Boolean, default: false },
      /*
      emailVerificationToken values not accessible
      won't be loaded from the database at all
      */
      emailVerificationToken: {
        type: String,
        maxlength: 255,
        select: false,
      },
      emailVerificationTokenExpiresAt: { type: Date },
       /*
      passwordResetToken values not accessible
      won't be loaded from the database at all
      */
      passwordResetToken: {
        type: String,
        maxlength: 255,
        select: false,
      },
      passwordResetTokenExpiresAt: { type: Date },
      tenants: [TenantUserSchema],
      jwtTokenInvalidBefore: { type: Date },
      createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'user',
      },
      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'user',
      },
      importHash: { type: String, maxlength: 255 },
    },
    {
      timestamps: true,
    },
  );
 /*
      unique importHash
*/
  UserSchema.index(
    { importHash: 1 },
    {
      unique: true,
      partialFilterExpression: {
        importHash: { $type: 'string' },
      },
    },
  );

  UserSchema.virtual('id').get(function () {
    // @ts-ignore
    return this._id.toHexString();
  });

  UserSchema.set('toJSON', {
    getters: true,
  });

  UserSchema.set('toObject', {
    getters: true,
  });

  return database.model('user', UserSchema);
};
