// cPanel (Phusion Passenger) entry point. Passenger sets PORT; Next's
// standalone server reads it. Everything lives next to this file.
process.env.NODE_ENV = "production";
process.chdir(__dirname);
require("./server.js");
