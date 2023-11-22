import mongoose from "mongoose";
import jobConfigurationSeed from "../seed/jobConfigurationSeed";
import Job from "../../cronjob/dbUpdateJob";

export async function loadMongoose() {
  let mongoUri = `mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DATABASE}`;

  if (process.env.MONGO_USERNAME && process.env.MONGO_PASSWORD) {
    mongoUri = `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DATABASE}`;
  }

  const connect = await mongoose.connect(mongoUri);
  const connection = connect.connection;
  connection.on(
    "error",
    // eslint-disable-next-line
    console.error.bind(console, "MongoDB connection error: ")
  );

  await jobConfigurationSeed().then(() => {
    // Job lauch after succesfully seeded the database
    // temprarily here to not broke the unit tests
    Job();

    console.log("Seed succeeded");
  });

  return connection;
}
