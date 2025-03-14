export default () => ({
  mongoUri:
    process.env.MONGO_URI ||
    'mongodb://admin:cisco123@13.234.241.103:27017/iotdb?authSource=admin&readPreference=primary&ssl=false',
});
