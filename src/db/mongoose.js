const mongoose = require('mongoose');
const validate = require('validator')

const uri = process.env.MONGODB

async function main() {
  await mongoose.connect(uri);
}

main().catch(err => console.log(err));
