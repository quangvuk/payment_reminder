const express = require('express');
const app = express();
const port = 3000;


// Sendgrid
const key = require('./key/key');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(key.SENDGRID_API_KEY);

// Node-cron schedule task
const cron = require('node-cron');
var task = cron.schedule('* * * * *', () => {
    console.log('running a task sending email every minute');
    //reminderSystem();
});

// Body Parser
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

// Cloud Firestore
const admin = require('firebase-admin');
let serviceAccount = require('./key/bill-reminder-84699-firebase-adminsdk-xyysr-dfd724b8dc.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
let db = admin.firestore();

// View engine PUG
app.set('view engine', 'pug');
app.set('views', './views');


// Sending email
function sendEmail(info) {
    let msg = {
        to: info.email,
        from: 'quangvuk@outlook.com',
        subject: 'Bill Payment Reminder',
        text: 'Vui long thanh toan!',
        html: '<strong>Tong cong ' + info.Amount + ' VND, noi dung : "' + info.Description + '" Thoi gian: ' + info.NotedDate + '</strong>',
    };
    sgMail.send(msg).then(val => {
        console.log('sent successfully');
    }).catch(err => {
        console.log('failed');
    });
    return msg;
}

function logActivity(info) {
    let log = db.collection('log_db').doc().set({
        'ReminderId': info.Id,
        'UserId': info.UserId,
        'UserName': info.UserName,
        'Timestamp': admin.firestore.FieldValue.serverTimestamp()
    }).then(val => { 
        console.log('Logged....!');
    }).catch(err => {
        console.log();
    });

    let reminder = db.collection('reminder_list').doc(info.Id).update({
        Count: ++info.Count,
        LastReminder: admin.firestore.FieldValue.serverTimestamp()
    });
   
}


function reminderSystem() {
    db.collection('reminder_list').get()
        .then((snapshot) => {
            snapshot.forEach((doc) => {
                if (!doc.data().IsDone) {
                    let data = doc.data();
                    data.Id = doc.id;
                    //sendEmail(data);
                    logActivity(data);
                }
            });
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });

}


app.get('/', (req, res) => {
    let users = [];
    db.collection('users').get()
        .then((snapshot) => {
            snapshot.forEach((doc) => {
                let user = {
                    id: doc.id,
                    data: doc.data()
                }
                users.push(user);
            });
            res.render('assign_page', { users });
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });
});

app.get('/management', (req, res) => {
    let reminders = [];
    db.collection('reminder_list').get()
        .then((snapshot) => {
            let index = 0;
            snapshot.forEach((doc) => {
                let tempData = doc.data();
                tempData.Index = index++;
                tempData.Id = doc.id;
                reminders.push(tempData);

            });
            //console.log(reminders);
            res.render('management_page', { reminders });
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });
})

app.get('/management/:reminderId', (req, res) => {
    let reminderId = req.params.reminderId;

    db.collection("reminder_list").doc(reminderId).update({
        IsDone: true
    }).then(val => {
        res.redirect('/management');
    });

});


app.get('/user/create', (req, res) => {
    let users = [];
    db.collection('users').get().then((snapshot) => {
        let index = 0;
        snapshot.forEach((doc)=>{
            let oneUser = doc.data();
            oneUser.Index = index++;
            oneUser.Id = doc.id;
            users.push(oneUser);
        });
    
        res.render('user_page',{users});

    }).catch(err => {
        res.redirect('/');
    });
});

app.get('/user/delete/:userId', (req, res) => {
    let userId = req.params.userId;
    let deleteUser = db.collection('users').doc(userId).delete();
    deleteUser.then(val => {
        console.log('Delete sucessfully => ' + userId);
        res.redirect('/user/create');
    }).catch(err => {
        console.log(err);
        res.redirect('/user/create');
    });
});

app.get('/user/edit/:userId', (req, res) => {
    db.collection('users').doc(req.params.userId).get()
    .then(doc => {
        if (!doc.exists) {
            console.log('Not found!');
        } else {
            let info = doc.data();
            info.Id = doc.id;
           res.render('edit_user',{info});
        }
    })
});

app.get('/log', (req, res) => {
    let logs = [];
    db.collection('log_db').get().then(snapshot => {
        
        let index = 0;
        snapshot.forEach(doc => {
            let data = doc.data();
            data.Id = doc.id;
            data.Index = index++;
            logs.push(data);
        });
        res.render('log_activity_page',{logs});
    }).catch(err => {
        console.log(err);
    });
});

app.post('/', (req, res) => {
    //console.log(req.body);
    db.collection("users").doc(req.body.user)
        .get()
        .then(function (doc) {
            let info = {};
            if (doc.exists) {
                info.name = doc.data().Name;
                info.email = doc.data().Email;
                info.phone = doc.data().Phone;
                info.slackId = doc.data().SlackId;
            } 

            let reminder = db.collection('reminder_list').doc();
                let setReminder = reminder.set({
                    'Amount': req.body.amount,
                    'Created': admin.firestore.FieldValue.serverTimestamp(),
                    'LastReminder': admin.firestore.FieldValue.serverTimestamp(),
                    'NotedDate': req.body.date,
                    'UserId': req.body.user,
                    'UserName': info.name,
                    'Email': info.email,
                    'Phone': info.phone,
                    'SlackId': info.slackId,
                    'PhoneReminder': req.body.phone === 'true' ? true : false,
                    'SlackReminder': req.body.slack === 'true' ? true : false,
                    'EmailReminder': req.body.email === 'true' ? true : false,
                    'Interval': req.body.interval,
                    'Description': req.body.description,
                    'Count': 0,
                    'IsDone': false
                });
        }).catch(function (error) {
            console.log("Error getting document USER:", error);
        });
    //console.log(req.body);
    res.redirect('/');
});

app.post('/user/create', (req, res) => {
    let users = db.collection('users').doc();

    let newUser = users.set({
        'Name': req.body.name,
        'Email': req.body.email,
        'Phone': req.body.phone,
        'SlackId': req.body.slackId
    });

    newUser.then(val => {
        console.log("Create new user successfully!");
        res.redirect('/user/create');
    }).catch(err => {
        console.log("Failed to create new user")
    });
});

app.post('/user/edit', (req, res) => {
    db.collection('users').doc(req.body.id).update({
        'Name': req.body.name,
        'Email': req.body.email,
        'Phone': req.body.phone,
        'SlackId': req.body.slackId
    }).then(val => {
        res.redirect('/user/create');
    }).catch(err => {
        console.log(err);
    })
})
app.listen(port, () => console.log(`Running on port ${port}`));