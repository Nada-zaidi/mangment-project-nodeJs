import mongoose from 'mongoose';
const Schema = mongoose.Schema;

export default (database) => {
  try {
    return database.model('tenant');
  } catch (error) {
  }

  const TenantSchema = new Schema(
    {
      name: {
        type: String,
        required: true,
        maxlength: 255,
      },
      url: { type: String, maxlength: 1024 },
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
    { timestamps: true },
  );
  /*defined a unique index on the document property importHash.
    importHash is unique
  */
  TenantSchema.index(
    { importHash: 1 },
    {
      unique: true,
      partialFilterExpression: {
        importHash: { $type: 'string' },
      },
    },
  );
/* get id document, convert it toHexString and create dynamclly new id that we can use
the new id is not stored in MongoDB  
*/
  TenantSchema.virtual('id').get(function () {
    // @ts-ignore
    return this._id.toHexString();
  });
/*
  apply the getters
  reflect change in respanse
*/
  TenantSchema.set('toJSON', {
    getters: true,
  });

  TenantSchema.set('toObject', {
    getters: true,
  });

  return database.model('tenant', TenantSchema);
};
