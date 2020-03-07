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
function sendEmail(amount, notedDate) {
    let msg = {
        to: 'kvkuypatckrdafbjlk@ttirv.net',
        from: 'quangvuk@outlook.com',
        subject: 'Bill Payment Reminder',
        text: 'Make payment for your bill please!',
        html: '<strong>Amount...' + amount + '....Noted Date...' + notedDate + '....</strong>',
    };
    sgMail.send(msg).then(val => {
        console.log('sent successfully');
    }).catch(err => {
        console.log('failed');
    });
    return msg;
}

function reminderSystem() {
    db.collection('reminder_list').get()
        .then((snapshot) => {
            snapshot.forEach((doc) => {
                if (!doc.data().IsDone) {
                    let data = doc.data();
                    sendEmail(data.Amount, data.NotedDate);
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
                //console.log(doc.id, '=>', doc.data());
            });
            console.log(users);
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
                // let user = db.collection('users').doc(tempData.UserId);
                // let getUser = user.get().then(val => {
                //     tempData.UserName = val;
                // }).catch(err => {
                //     tempData.UserName = 'Not found';
                //     console.log('Failed to find user!');
                // })
                reminders.push(tempData);

            });
            console.log(reminders);
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
    res.render('create_user');
});

app.post('/', (req, res) => {
    //console.log(req.body);
    db.collection("users").doc(req.body.user)
        .get()
        .then(function (doc) {
            let name = '';
            if (doc.exists) {
                name = doc.data().Name;
            } 

            let reminder = db.collection('reminder_list').doc();
                let setReminder = reminder.set({
                    'Amount': req.body.amount,
                    'Created': Date(Date.now()),
                    'LastReminder': Date(Date.now()),
                    'NotedDate': req.body.date,
                    'UserId': req.body.user,
                    'UserName': name,
                    'PhoneReminder': req.body.phone === 'true' ? true : false,
                    'SlackReminder': req.body.slack === 'true' ? true : false,
                    'EmailReminder': req.body.email === 'true' ? true : false,
                    'Interval': req.body.interval,
                    'Description': req.body.description,
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

app.listen(port, () => console.log(`Running on port ${port}`));