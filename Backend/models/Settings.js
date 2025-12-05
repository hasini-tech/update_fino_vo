import mongoose from "mongoose";

const platformSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  platformName: { type: String, required: true },
  apiUrl: { type: String, required: true },
  accessToken: { type: String, default: '' },
  isActive: { type: Boolean, default: false },
  extraFields: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const settingsSchema = new mongoose.Schema({
  platforms: { type: [platformSchema], default: [] },
  tenantId: { 
    type: String, // Changed from mongoose.Schema.Types.ObjectId to String
    required: true
  }
}, { timestamps: true });

// Optional tenant index
settingsSchema.index({ tenantId: 1 }, { name: 'settings_tenantId_index' }); // ✅ renamed

const Settings = mongoose.model("Settings", settingsSchema);
export default Settings;