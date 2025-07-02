const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 3000


const admin = require("firebase-admin");

const serviceAccount = require("./firebase-admin-servicekey.json");


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()


// middleware

app.use(cors())
app.use(express.json())

const verifyFirebaseToken=async(req,res,next)=>{
  const authHeader=req.headers?.authorization
 if(!authHeader || !authHeader.startsWith('Bearer '))
{
  return res.status(401).send({message:'Unauthorezed access'})
}

const token=authHeader.split(' ')[1]

try{
  const decoded=await admin.auth().verifyIdToken(token)
  console.log('decoded token', decoded)
  req.decoded=decoded
  next()
}
catch(error){
  return res.status(401).send({message:'Unauthorezed access'})
}
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sgdhrky.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});




admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const courseCollection = client.db('LearnMate').collection('course')
    const studentCollection = client.db('LearnMate').collection('students')
    const enrollmentCollection = client.db('LearnMate').collection('enrollments');
    // students review post 




    app.get('/students', async (req, res) => {
      const result = await studentCollection.find().toArray();
      res.send(result);
    });



    // course api 
    app.post('/courses', async (req, res) => {
      const course = { ...req.body, createdAt: new Date() }
      const result = await courseCollection.insertOne(course)
      console.log(result)
      res.send(result)
    })
    // enrollment 

    app.post('/courses-enroll', async (req, res) => {
      const { courseId, email, title, description } = req.body
      const alreadyEnrolled = await enrollmentCollection.findOne({ courseId, email })
      if (alreadyEnrolled) {
        return res.status(400).send({ message: 'Already enrolled' });
      }

      const enrollment = {
        courseId,
        email,
        title,
        description
      }

      const result = await enrollmentCollection.insertOne(enrollment);
      res.send(result);
    })

    app.get('/popular-courses', async (req, res) => {
      const courses = await courseCollection.find().toArray();

      for (const course of courses) {
        const enrollQuery = { courseId: course._id.toString() };
        const enrollment_count = await enrollmentCollection.countDocuments(enrollQuery);
        course.enrollment_count = enrollment_count;
      }

      const mostEnrolledCourses = courses.sort((a, b) => b.enrollment_count - a.enrollment_count);
      res.send(mostEnrolledCourses);
    });

    // overall course enroll 
    app.get('/courses-enroll', async (req, res) => {
      const { courseId, email } = req.query;

      if (!courseId || !email) {
        return res.status(400).send({ message: 'Missing courseId or email' });
      }

      const enrolled = await enrollmentCollection.findOne({ courseId, email });
      res.send({ enrolled: !!enrolled });
    });

    // my enrollment 

    app.get('/my-enrollments',verifyFirebaseToken, async (req, res) => {
      const { email } = req.query;
       if(email!==req.decoded.email){
        return req.status(403).send({message:'forbidden access'})
      }
      const result = await enrollmentCollection.find({ email }).toArray();
      res.send(result);
    });


// filtered courses 
    app.get('/courses', async (req, res) => {

  try {
    const latestCourses = await courseCollection
      .find()
      .sort({ _id: -1 })
      .limit(8)
      .toArray();

    let result = latestCourses;

    if (latestCourses.length < 8) {
      const latestIds = latestCourses.map((c) =>
        typeof c._id === 'string' ? new ObjectId(c._id) : c._id
      );

      const fillCourses = await courseCollection
        .find({ _id: { $nin: latestIds } })
        .sort({ _id: 1 }) // oldest first
        .limit(8 - latestCourses.length)
        .toArray();

      result = [...latestCourses, ...fillCourses];
    }

    res.send(result);
  } catch (err) {
    console.error("Error loading courses:", err);
    res.status(500).send({ message: "Server error" });
  }

    })
    // over all courses
    app.get('/courses-all', async (req, res) => {

      const result = await courseCollection.find().toArray()
      res.send(result)
    })




    app.get('/courses-find',verifyFirebaseToken, async (req, res) => {

      const email = req.query.email
      if(email!==req.decoded.email){
        return req.status(403).send({message:'forbidden access'})
      }
      console.log('req header',req.headers)
      const query = {}
      if (email) {
        query.email = email
      }

      const result = await courseCollection.find(query).toArray()
      res.send(result)
    })


    app.get('/tutorials/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await courseCollection.findOne(query)
      res.send(result)
    })

    app.get('/courses-find/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await courseCollection.findOne(query);
      res.send(result);
    });

    app.put('/courses-find/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updatedPost = req.body
      const updatedDoc = {
        $set: updatedPost
      }

      const result = await courseCollection.updateOne(filter, updatedDoc)
      res.send(result)

    })


    app.delete('/courses-find/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await courseCollection.deleteOne(query)
      res.send(result)
    })


    // remove my enrollments 
    app.delete('/courses-enroll/:id', async (req, res) => {
      const id = req.params.id;
      console.log('Delete request for enrollment id:', id);

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: 'Invalid id format' });
      }

      const result = await enrollmentCollection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 1) {
        res.send({ deletedCount: 1 });
      }


    });



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error

  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Learn Mate Is Running')
})





app.listen(port, () => {
  console.log(`Learn mate server is running in port  ${port}`)
})


