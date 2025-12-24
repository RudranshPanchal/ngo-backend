import mongoose from "mongoose";
const fundraisingSchema = new mongoose.Schema({
  name: String,
  city: String,
payment: { type: Number, default: 0 },
  image: String,
  description: String,
  limit:Number,
  tags: [String],
  
});

export default mongoose.model("fundRaisingrout ", fundraisingSchema);