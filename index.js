const express = require('express');
const app = express();
const port = 3000;


// Sendgrid
const key = require('./key/key');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(key.SENDGRID_API_KEY);

// Node-cron schedule task
const cron = require('node-cron');
var task=cron.schedule('* * * * *', () => {
    console.log('running a task sending email every minute');
    //reminderSystem();
});

// Body Parser
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

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
function sendEmail(amount, notedDate){
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

function reminderSystem(){
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
            res.render('assign_page',{users});
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        }); 
});

app.get('/management', (req, res) => {
    let reminders = [];
    db.collection('reminder_list').get()
        .then((snapshot) => {
            snapshot.forEach((doc) => {
                reminders.push(doc.data());
                
            });
            console.log(reminders);
            res.render('management_page',{reminders});
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        }); 
})


app.get('/user/create', (req, res) => {
    res.render('create_user');
});

app.post('/', (req, res) => {
    console.log(req.body);
    let reminder = db.collection('reminder_list').doc();

    let setReminder = reminder.set({
        'Amount':req.body.amount,
        'Created': Date(Date.now()),
        'LastReminder': Date(Date.now()),
        'NotedDate':req.body.date,
        'UserId': req.body.user,
        'PhoneReminder': req.body.phone==='true'?true:false,
        'SlackReminder': req.body.slack==='true'?true:false,
        'EmailReminder': req.body.email==='true'?true:false,
        'Interval': req.body.interval,
        'Description': req.body.description,
        'IsDone':false
    });
    console.log(req.body);
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

    newUser.then( val => {
        console.log("Create new user successfully!");
    }).catch( err => {
        console.log("Failed to create new user")
    });
});

app.listen(port, () => console.log(`Running on port ${port}`));