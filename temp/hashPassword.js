// university/temp/hashPassword.js
const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('admin1234', 10));