require('dotenv').config();
const mongoClient = require("mongodb").MongoClient;
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: 'https://hospital-frontend.onrender.com'
  }));

/** ============ Trainee Requests ============ */

// ✅ Submit a trainee request
app.post("/request-trainee", async (req, res) => {

    try {
        const client = await mongoClient.connect(MONGO_URI);
        const database = client.db("Training-Management-System");

        console.log("📢 Received Trainee Request:", req.body);

        const traineeRequest = {
            TraineeId: parseInt(req.body.TraineeId),
            TraineeName: req.body.TraineeName,
            Class: req.body.Class,
            Number: parseInt(req.body.Number),
            Age: parseInt(req.body.Age),
            Dob: req.body.Dob,
            Gender: req.body.Gender,
            Status: "Pending",
            TrainingRoom: req.body.TrainingRoom
        };

        await database.collection("TraineeRequests").insertOne(traineeRequest);
        console.log("✅ Trainee request saved to DB");

        client.close();
        res.json({ message: "Trainee request submitted." });
    } catch (error) {
        console.error("❌ Error submitting trainee request:", error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ Approve or Reject a Trainee Request
// ✅ Approve or Reject a Trainee Request
// ✅ Approve or Reject a Trainee Request
app.put("/approve-trainee/:id", async (req, res) => {
    try {
        const client = await mongoClient.connect(MONGO_URI);
        const database = client.db("Training-Management-System");

        const { status } = req.body;
        if (!["Accepted", "Rejected"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const traineeId = parseInt(req.params.id);
        const traineeRequest = await database.collection("TraineeRequests").findOne({ TraineeId: traineeId });

        if (!traineeRequest) {
            return res.status(404).json({ message: "Trainee request not found" });
        }

        // ✅ Automatically assign a training room (Room A or Room B)
        const assignedRoom = status === "Accepted" ? (Math.random() < 0.5 ? "Room A" : "Room B") : "";

        await database.collection("TraineeRequests").updateOne(
            { TraineeId: traineeId },
            { $set: { Status: status, TrainingRoom: assignedRoom } }
        );

        if (status === "Accepted") {
            // ✅ Avoid duplicate trainee entries
            const existingTrainee = await database.collection("Trainees").findOne({ TraineeId: traineeId });

            if (!existingTrainee) {
                const newTrainee = {
                    TraineeId: traineeRequest.TraineeId,
                    TraineeName: traineeRequest.TraineeName,
                    Class: traineeRequest.Class,
                    Number: traineeRequest.Number,
                    Age: traineeRequest.Age,
                    Dob: traineeRequest.Dob,
                    Gender: traineeRequest.Gender,
                    TrainingRoom: traineeRequest.TrainingRoom
                };
                await database.collection("Trainees").insertOne(newTrainee);
                console.log("✅ Trainee moved to Trainees list");
            }
        }

        client.close();
        res.json({ message: `Trainee request ${status}` });
    } catch (error) {
        console.error("❌ Error updating trainee request:", error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ Get all pending trainee requests
app.get("/trainee-requests", async (req, res) => {
    try {
        const client = await mongoClient.connect(MONGO_URI);
        const database = client.db("Training-Management-System");
        const trainees = await database.collection("TraineeRequests").find({ Status: "Pending" }).toArray();

        client.close();
        res.json(trainees);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Get all trainees (Trainee List)
app.get("/get-trainee", async (req, res) => {
    try {
        const client = await mongoClient.connect(MONGO_URI);
        const database = client.db("Training-Management-System");
        const trainees = await database.collection("Trainees").find({}).toArray();

        console.log("📢 Fetching Trainees:", trainees);

        client.close();
        res.json(trainees);
    } catch (error) {
        console.error("❌ Error fetching trainees:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// ===========================================================

app.get("/get-trainee/:id", (req, res) => {
    const traineeId = parseInt(req.params.id); // Ensure it's a number
    console.log("Received ID in Backend:", traineeId);

    mongoClient.connect(MONGO_URI).then(client_obj => {
        const database = client_obj.db("Training-Management-System");

        database.collection("Trainees").findOne({ TraineeId: traineeId })
            .then(document => {
                client_obj.close();
                if (document) {
                    res.send(document);
                } else {
                    console.log("Trainee not found in DB:", traineeId);
                    res.status(404).json({ message: "Trainee not found" });
                }
            });
    }).catch(error => res.status(500).json({ error: error.message }));
});


app.put("/edit-trainee/:id", (req, res) => {
    mongoClient.connect(MONGO_URI).then(client_obj => {
        const database = client_obj.db("Training-Management-System");
        const traineeId = isNaN(req.params.id) ? req.params.id : parseInt(req.params.id);

        database.collection("Trainees").updateOne(
            { TraineeId: traineeId },
            { $set: { 
                TraineeName: req.body.TraineeName, 
                Class: req.body.Class, 
                Number: req.body.Number, 
                Age: req.body.Age, 
                Dob: req.body.Dob, 
                Gender: req.body.Gender 
            }}
        ).then(result => {
            client_obj.close();
            if (result.modifiedCount === 0) {
                res.status(404).json({ message: "Trainee not found" });
            } else {
                res.json({ message: "Trainee Updated Successfully" });
            }
        });
    }).catch(error => res.status(500).json({ error: error.message }));
});




app.delete("/delete-trainee/:id", (req, res) => {
    mongoClient.connect(MONGO_URI).then(client_obj => {
        const database = client_obj.db("Training-Management-System");
        database.collection("Trainees").deleteOne({ TraineeId: parseInt(req.params.id) }).then(result => {
            if (result.deletedCount === 0) {
                res.status(404).json({ message: "Trainee not found" });
            } else {
                res.json({ message: "Trainee Deleted Successfully" });
            }
        });
    }).catch(error => res.status(500).json({ error: error.message }));
});




// ✅ Get attendance (Approved trainees only)
// ✅ Get attendance (Only count accepted trainees)
app.get("/attendance", async (req, res) => {
    try {
        const client = await mongoClient.connect(MONGO_URI);
        const database = client.db("Training-Management-System");

        // Fetch only trainees who have been accepted into training
        const trainees = await database.collection("Trainees").find({}).toArray();

        client.close();
        res.json({ attendance: trainees.length, trainees });
    } catch (error) {
        console.error("❌ Error fetching attendance:", error);
        res.status(500).json({ error: error.message });
    }
});

/** ============ Trainers API ============ */

// ✅ Get all trainers
app.get("/get-trainer", async (req, res) => {
    try {
        const client = await mongoClient.connect(MONGO_URI);
        const database = client.db("Training-Management-System");
        const trainers = await database.collection("Trainers").find({}).toArray();

        client.close();
        res.json(trainers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/get-trainer/:id", async (req, res) => {
    try {
        const client = await mongoClient.connect(MONGO_URI);
        const database = client.db("Training-Management-System");
        const trainer = await database.collection("Trainers").findOne({ TrainerId: parseInt(req.params.id) });

        client.close();
        if (!trainer) return res.status(404).json({ error: "Trainer not found" });
        res.json(trainer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put("/edit-trainer/:id", async (req, res) => {
    try {
        const client = await mongoClient.connect(MONGO_URI);
        const database = client.db("Training-Management-System");

        const result = await database.collection("Trainers").updateOne(
            { TrainerId: parseInt(req.params.id) },
            { $set: { TrainerName: req.body.TrainerName, Number: req.body.Number, Subject: req.body.Subject, Salary: req.body.Salary } }
        );

        client.close();
        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: "Trainer not found" });
        }
        res.json({ message: "Trainer Updated Successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ✅ Register a new trainer
app.post("/add-trainer", async (req, res) => {
    try {
        const client = await mongoClient.connect(MONGO_URI);
        const database = client.db("Training-Management-System");

        const trainer = {
            TrainerId: parseInt(req.body.TrainerId),
            TrainerName: req.body.TrainerName,
            Mobile: req.body.Mobile,
            Subject: req.body.Subject,
            Salary: req.body.Salary
        };

        await database.collection("Trainers").insertOne(trainer);
        client.close();

        res.json({ message: "Trainer Registered" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put("/edit-trainer/:id", (req, res) => {
    mongoClient.connect(MONGO_URI).then(client_obj => {
        const database = client_obj.db("Training-Management-System");

        database.collection("Trainers").updateOne(
            { TrainerId: parseInt(req.params.id) },
            { $set: { TrainerName: req.body.TrainerName, Number: req.body.Number, Subject: req.body.Subject, Salary: req.body.Salary } }
        ).then(result => {
            if (result.modifiedCount === 0) {
                res.status(404).json({ message: "Trainer not found" });
            } else {
                res.json({ message: "Trainer Updated Successfully" });
            }
        });
    }).catch(error => res.status(500).json({ error: error.message }));
});

app.delete("/delete-trainer/:id", (req, res) => {
    mongoClient.connect(MONGO_URI).then(client_obj => {
        const database = client_obj.db("Training-Management-System");
        database.collection("Trainers").deleteOne({ TrainerId: parseInt(req.params.id) }).then(result => {
            if (result.deletedCount === 0) {
                res.status(404).json({ message: "Trainer not found" });
            } else {
                res.json({ message: "Trainer Deleted Successfully" });
            }
        });
    }).catch(error => res.status(500).json({ error: error.message }));
});



app.post("/signup", async (req, res) => {
    try {
        const client = await mongoClient.connect(MONGO_URI);
        const database = client.db("Training-Management-System");

        const traineeData = {
            Email: req.body.email,
            Password: req.body.password
        };

        await database.collection("Trainee-Signup").insertOne(traineeData);
        client.close();

        // ✅ Generate JWT token after signup
        const token = jwt.sign({ email: traineeData.Email }, "your_secret_key", { expiresIn: "1d" });

        res.status(201).json({ message: "Signup successful", token });  // ✅ Return token
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.get("/trainees", async (req, res) => {
    try {
        const client = await mongoClient.connect(MONGO_URI);
        const database = client.db("Training-Management-System");

        const trainees = await database.collection("Trainee-Signup").find().toArray();
        client.close();

        res.status(200).json(trainees);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});






// ✅ Start the server
app.listen(PORT, () => {
    console.log("🚀 Server Started at ", PORT);
});
