import project from "../database/models/project";
import tenant from "../database/models/tenant";
import user from "../database/models/user";

const mongoose = require('mongoose');
const models = [
  require('../database/models/project').default, 
  require('../database/models/user').default,
  require('../database/models/project').default,
  require('../database/models/task').default,  
];
const admin = {
  email : "admin@gmail.com",
  password: "test",
  role: "admin"

}
const testten = {
  name : "tenant test",
  createdBy: admin,
  updatedBy: admin
}
let db = null;
  beforeAll(async () => {  
    const connection = await mongoose.connect('mongodb://localhost:27017/testdb',
    {useNewUrlParser: true, 
    useUnifiedTopology: true });
    db = mongoose.connection;
    for (let model of models){
      await model(db).createCollection
    }
 });
 describe("add tenant", () => {
  it("should create tenat", async() => {
    const response = await tenant(db).create({
      name: testten.name
    });
      await response.save();
      expect(response.name).toBe(testten.name);
  });
});
 describe("add admin", () => {
  it("should create user db", async() => {
    const response = await user(db).create({
      email: admin.email,
      password: admin.password,
      role: admin.role
    });
      await response.save();
      expect(response.email).toBe("admin@gmail.com");
  });
});
describe("should add project only as admin", () => {
  it("should create user db", async() => {
    const response = await project(db).create({
      title: "project test",
      description: "test",
      admins: admin,
      tenant: testten
    });
      await response.save();
      expect(response.admins.role).toBe("admin");
  });
});