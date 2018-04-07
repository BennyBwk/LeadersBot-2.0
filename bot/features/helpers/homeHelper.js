// Basic Imports
const Telegraf = require('telegraf')
const Promise = require('bluebird');
const cron = require('node-cron');
const schedule = require('node-schedule')
//DB Imports
const Users = require('../../../models/Users.js');
const AdminUsers = require('../../../models/AdminUsers.js');
const Files = require('../../../models/Files.js');
const Attendance = require('../../../models/Attendance.js');
const Weeks = require('../../../models/Weeks.js');
const Birthdays = require('../../../models/Birthdays.js');
//Flow & Router Imports
const TelegrafFlow = require('telegraf-flow')
const { Router, Extra, memorySession } = Telegraf
const { WizardScene } = TelegrafFlow
const { Scene } = TelegrafFlow
//const {bot} = require('../../bot.js');
const bot = new Telegraf("395832440:AAGi128LE7h3zoJlYZKNfXg9vTqFoDLwGWA");
//Variable Initialisation
const flow = new TelegrafFlow();

let task = cron.schedule('0 0 0 * * 1', function(){
    Weeks.findOne({}, {}, { sort: {_id:-1} }, function(err, doc) {
        var currentweek = doc.week
        var weektoaddnow = currentweek + 1;
        Weeks.update(
            {
               week : weektoaddnow
            },
            {
                week : weektoaddnow,
                weekid : weektoaddnow
            },
            { upsert : true },
            function(error,doc) {
                if (error) throw error;
            }
        );
    });
    task.start();
});

function sendMsg(ctxinfo){
    var stream = Users.find({'tosend' : 'true'}).stream();
    stream.on('data', function (doc) {
        setTimeout(function(){
              ctxinfo.telegram.sendMessage(doc.telegram_id, "Good Afternoon! 🌤\nDo remember to update attendance!");
          }, 1000)
    }).on('error', function (err) {
        if (err) throw error;
    }).on('close', function () {
        //Do Nothing
    });
}

async function do_cron(ctx){

    var ctxinfo = ctx;

    let task2 = cron.schedule('0 12 * * 4', function() {
        sendMsg(ctxinfo);
        task2.start();
    });

    var cronArray = [];
    var stream = Birthdays.find({}).stream();
    stream.on('data', function (doc) {
        var birthdate = doc.birthdate; var birthdayage = doc.age + 1;
        var birthdatearray = birthdate.split("/");
        var birthdayperson = doc.name;
        var birthday = birthdatearray[0] * 1; var birthmonth = birthdatearray[1] * 1;
        var cronInfo = "0 0 0 " + birthday + " " + birthmonth + " *" + "//" + birthdayperson + "//" + birthdayage;
        cronArray.push(cronInfo);
    }).on('error', function (err) {
        if (err) throw error;
    }).on('close', function () {
        cronArray.forEach(function(cronObject){
            var cron_timing = cronObject.split("//")[0];
            var person = cronObject.split("//")[1];
            var age = cronObject.split("//")[2];
            let remind = schedule.scheduleJob(cron_timing, function(){
                var stream = Users.find({'status' : 'Admin'}).stream();
                stream.on('data', function (doc) {
                    setTimeout(function(){
                          ctxinfo.telegram.sendMessage(doc.telegram_id, "Birthday Reminder 🎉\nToday is " + person + "'s birthday\nHe/She is now " + age + " years old");
                      }, 1000)
                }).on('error', function (err) {
                    if (err) throw error;
                }).on('close', function () {
                    Birthdays.findOneAndUpdate({'name' : person}, {'age' : age}, {upsert:true}, function(err, doc){
                        if (err) throw err;
                    });
                });
            });
        });
    });
}

module.exports = {

    do_cron:do_cron,

    isAdmin_normal: (ctx) => {
        let userId = ctx.message.from.id
        return (verseAdderICs.indexOf(userId) != -1)
    },

    //checkUserAlreadyExists function
    checkUserAlreadyExists: function(ctx, callback){
        Users.findOne( {'telegram_id' : ctx.update.message.from.id }, function (err, userObject) {
            if (userObject != undefined){
                if (userObject.status == "Admin"){
                    var message = "Your identity has been verified.\nWelcome <b>" + userObject.username + "</b>!\nType /menu to access the main menu.";
                    callback(message);
                } else {
                    var message = "You are now registered in the system but only approved users are able to use the functions. Please contact @bennyboon for more information."
                    callback(message);
                }
            } else {
                let userObject = ctx.update.message.from
                Users.update(
                    { telegram_id : userObject.id },
                    {
                        telegram_id: userObject.id,
                        username: userObject.username,
                        status: "Pending",
                        tosend: "false"
                    },
                    { upsert : true },
                    function(error,doc) {
                        if (error) throw error;
                        var message = "You are not registered in the system. Please contact @bennyboon for more information."
                        callback(message);
                    }
                );
            }
        });
    },

    addDocumentToDatabase: (ctx) => {
        let docFile = ctx.update.message.document
        return new Promise((resolve,reject)=>{
            Files.update(
                { fileName : docFile.file_name },
                {
                    fileName: docFile.file_name,
                    telegramFileId: docFile.file_id,
                },
                { upsert : true },
                function(error,doc) {
                    if (error) throw error;
                    let doneObject = {
                        info:"Document Inserted Successfully!!",
                        documentInserted: docFile,
                        documentInsertSuccess: doc,
                    }
                    resolve(doneObject);
                }
            );
        })
    },

    getFileAndSend: (ctx) => {
        var stream = Files.find({}).stream();
        stream.on('data', function (doc) {
            var fileId = doc.telegramFileId
            ctx.telegram.sendDocument(ctx.message.from.id, fileId);
        }).on('error', function (err) {
            if (err) throw error;
            ctx.telegram.sendMessage(ctx.message.from.id, "Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.")
        }).on('close', function () {
            // the stream is closed
        });
    },

    updateAttendance: (ctx, callback) => {
      Weeks.findOne({}, {}, { sort: {_id:-1} }, function(err, doc) {
        var currentweek = doc.week
        Attendance.update(
            {
              name : ctx.session.name,
              svcattending: ctx.session.selected_svc
            },
            {
                name: ctx.session.name,
                svcattending: ctx.session.selected_svc,
                status: ctx.session.selected_status,
                updatedby: ctx.session.messagefrom,
                week: currentweek,
                tbc: "false"
            },
            { upsert : true },
            function(error,doc) {
                if (error) throw error;
                var message = ctx.session.name + " has been added to Service " + ctx.session.selected_svc + " as a " + ctx.session.selected_status;
                callback(message);

                Weeks.update(
                    {
                      week : currentweek,
                      weekid: currentweek
                    },
                    {
                        week: currentweek,
                        weekid: currentweek,
                        last_updatee: ctx.session.messagefrom,
                        last_updated: new Date()
                    },
                    { upsert : true },
                    function(error,doc) {
                        if (error) throw error;
                    }
                );

            }
        );
      });
    },

    getAttendance: (ctx, callback) => {
      Weeks.findOne({}, {}, { sort: {_id:-1} }, function(err, doc) {
        var lastupdated = doc.last_updated.split(" ");
        var lastupdatedDay = lastupdated[0];
        var lastupdatedMth = lastupdated[1];
        var lastupdatedDate = lastupdated[2];
        var lastupdatedYear = lastupdated[3];
        var lastupdatedRawTime = lastupdated[4].split(":");
        var RawTimeHour = lastupdatedRawTime[0];
        var RawTimeMark = "AM";
        if (RawTimeHour === 12) {
            RawTimeMark = "PM";
        } else if (RawTimeHour > 12) {
            RawTimeMark = "PM";
            RawTimeHour = RawTimeHour - 12;
        }
        var RawTimeMin = lastupdatedRawTime[1];
        var lastupdatedTime = RawTimeHour + ":" + RawTimeMin + " " + RawTimeMark;
        var lastupdatee = doc.last_updatee;
        var currentweek = doc.week
            var svc1Rnames = ""; var svc1Rcount = 0; var svc1count = 0;
            var svc1Inames = ""; var svc1Icount = 0; var svc2count = 0;
            var svc1Nnames = ""; var svc1Ncount = 0; var svc3count = 0;
            var svc1Gnames = ""; var svc1Gcount = 0; var attdmsg = "";
            var svc2Rnames = ""; var svc2Rcount = 0;
            var svc2Inames = ""; var svc2Icount = 0;
            var svc2Nnames = ""; var svc2Ncount = 0;
            var svc2Gnames = ""; var svc2Gcount = 0;
            var svc3Rnames = ""; var svc3Rcount = 0;
            var svc3Inames = ""; var svc3Icount = 0;
            var svc3Nnames = ""; var svc3Ncount = 0;
            var svc3Gnames = ""; var svc3Gcount = 0;
            var stream = Attendance.find({}).stream();
            stream.on('data', function (doc) {
              if (doc.week == currentweek){
                if (doc.svcattending == "1"){
                    if (doc.status == "Regular"){
                        svc1Rnames = svc1Rnames + doc.name + "\n";
                        svc1Rcount = svc1Rcount + 1;
                        svc1count = svc1count + 1;
                    } else if (doc.status == "Integration"){
                        svc1Inames = svc1Inames + doc.name + "\n";
                        svc1Icount = svc1Icount + 1;
                        svc1count = svc1count + 1;
                    } else if (doc.status == "New Friend"){
                        svc1Nnames = svc1Nnames + doc.name + "\n";
                        svc1Ncount = svc1Ncount + 1;
                        svc1count = svc1count + 1;
                    } else if (doc.status == "Guest"){
                        svc1Gnames = svc1Gnames + doc.name + "\n";
                        svc1Gcount = svc1Gcount + 1;
                        svc1count = svc1count + 1;
                    }
                } else if (doc.svcattending == "2"){
                    if (doc.status == "Regular"){
                        svc2Rnames = svc2Rnames + doc.name + "\n";
                        svc2Rcount = svc2Rcount + 1;
                        svc2count = svc2count + 1;
                    } else if (doc.status == "Integration"){
                        svc2Inames = svc2Inames + doc.name + "\n";
                        svc2Icount = svc2Icount + 1;
                        svc2count = svc2count + 1;
                    } else if (doc.status == "New Friend"){
                        svc2Nnames = svc2Nnames + doc.name + "\n";
                        svc2Ncount = svc2Ncount + 1;
                        svc2count = svc2count + 1;
                    } else if (doc.status == "Guest"){
                        svc2Gnames = svc2Gnames + doc.name + "\n";
                        svc2Gcount = svc2Gcount + 1;
                        svc2count = svc2count + 1;
                    }
                } else if (doc.svcattending == "3"){
                    if (doc.status == "Regular"){
                        svc3Rnames = svc3Rnames + doc.name + "\n";
                        svc3Rcount = svc3Rcount + 1;
                        svc3count = svc3count + 1;
                    } else if (doc.status == "Integration"){
                        svc3Inames = svc3Inames + doc.name + "\n";
                        svc3Icount = svc3Icount + 1;
                        svc3count = svc3count + 1;
                    } else if (doc.status == "New Friend"){
                        svc3Nnames = svc3Nnames + doc.name + "\n";
                        svc3Ncount = svc3Ncount + 1;
                        svc3count = svc3count + 1;
                    } else if (doc.status == "Guest"){
                        svc3Gnames = svc3Gnames + doc.name + "\n";
                        svc3Gcount = svc3Gcount + 1;
                        svc3count = svc3count + 1;
                    }
                  }
                }
            }).on('error', function (err) {
                if (err) throw error;
                ctx.telegram.sendMessage(ctx.message.from.id, "Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.")
            }).on('close', function () {
                if (svc1count + svc2count + svc3count != 0){
                    attdmsg = "Here is the attendance for this week\n\n"
                } else {
                    attdmsg = "The attendance for this week has not been updated yet"
                }

                if (svc1count > 0) {
                attdmsg = "<b>Service 1 (" + svc1count + ")\nLeaders/Regulars (" + svc1Rcount + ")</b>\n" + svc1Rnames + "\n"
                }
                if (svc1Icount > 0) {
                attdmsg = attdmsg + "<b>Integrations (" + svc1Icount + ")</b>\n" + svc1Inames + "\n"
                }
                if (svc1Ncount > 0) {
                attdmsg = attdmsg + "<b>New Friends (" + svc1Ncount + ")</b>\n" + svc1Nnames + "\n"
                }
                if (svc1Gcount > 0) {
                attdmsg = attdmsg + "<b>Guests (" + svc1Gcount + ")</b>\n" + svc1Gnames + "\n"
                }

                if (svc2count > 0) {
                    if (svc1count > 0){
                        attdmsg = attdmsg + "-----\n<b>Service 2 (" + svc2count+ ")</b>\n"
                    } else {
                        attdmsg = attdmsg + "<b>Service 2 (" + svc2count+ ")</b>\n"
                    }
                }
                if (svc2Rcount > 0) {
                attdmsg = attdmsg + "<b>Leaders/Regulars (" + svc2Rcount + ")</b>\n" + svc2Rnames + "\n"
                }
                if (svc2Icount > 0) {
                attdmsg = attdmsg + "<b>Integrations (" + svc2Icount + ")</b>\n" + svc2Inames + "\n"
                }
                if (svc2Ncount > 0) {
                attdmsg = attdmsg + "<b>New Friends (" + svc2Ncount + ")</b>\n" + svc2Nnames + "\n"
                }
                if (svc2Gcount > 0) {
                attdmsg = attdmsg + "<b>Guests (" + svc2Gcount + ")</b>\n" + svc2Gnames + "\n"
                }

                if (svc3count > 0) {
                    if (svc2count > 0 || svc1count > 0){
                        attdmsg = attdmsg + "-----\n<b>Service 3 (" + svc3count+ ")</b>\n"
                    } else {
                        attdmsg = attdmsg + "<b>Service 3 (" + svc3count+ ")</b>\n"
                    }
                }
                if (svc3Rcount > 0) {
                attdmsg = attdmsg + "<b>Leaders/Regulars (" + svc3Rcount + ")</b>\n" + svc3Rnames + "\n"
                }
                if (svc3Icount > 0) {
                attdmsg = attdmsg + "<b>Integrations (" + svc3Icount + ")</b>\n" + svc3Inames + "\n"
                }
                if (svc3Ncount > 0) {
                attdmsg = attdmsg + "<b>New Friends (" + svc3Ncount + ")</b>\n" + svc3Nnames + "\n"
                }
                if (svc3Gcount > 0) {
                attdmsg = attdmsg + "<b>Guests (" + svc3Gcount + ")</b>\n" + svc3Gnames + "\n"
                }
                attdmsg = attdmsg + "Last Updated By <b>" + lastupdatee + "</b> (" + lastupdatedDay + " " + lastupdatedTime + ")";
                callback(attdmsg)
            });
          });
        },

        checkIfAdmin: (ctx, callback) => {
              Users.findOne( {'telegram_id' : ctx.update.message.from.id }, function (err, userObject) {
                  callback(userObject);
              });
        },

        removeAttendance: (ctx, callback) => {
            if (ctx.update.message.text == "/remove") {
                var message = "Remove attendance in this format.\n/remove <b>name</b> (Case Sensitive)\n<code>e.g. /remove Bob</code>"
                callback(message);
            } else {
                Weeks.count({}, function( err, currentweek){
                  if (err) throw error;
                  var attdname = ctx.update.message.text.replace('/remove ','');
                  Attendance.remove({ 'name': attdname, 'week': currentweek }, function(err, removed) {
                      if (err) throw err;
                      if (removed.result.n === 0) {
                          var message = attdname + " does not exist in this week's attendance!"
                          callback(message);
                      } else {
                          var message = attdname + " has been removed from this week's attendance successfully"
                          callback(message);

                          Weeks.update(
                              {
                                week : currentweek,
                                weekid: currentweek
                              },
                              {
                                  week: currentweek,
                                  weekid: currentweek,
                                  last_updatee: ctx.session.messagefrom,
                                  last_updated: new Date()
                              },
                              { upsert : true },
                              function(error,doc) {
                                  if (error) throw error;
                              }
                          );

                      }
                });
            })
          }
        },

        getBirthdayList: (ctx, callback) => {
            var d = new Date();
            var whichday = d.getDay();
            var day = d.getDate();
            var monthno = d.getMonth();
            var daymark;
            var year = d.getFullYear();
            if (day == 1){
                daymark = "st";
            } else if (day == 2) {
                daymark = "nd";
            } else if (day == 3) {
                daymark = "rd";
            } else {
                daymark = "th";
            }

            var whichdayday;
            if (whichday == 1){
                whichdayday = "Monday"
            } else if (whichday == 2){
                whichdayday = "Tuesday"
            } else if (whichday == 3){
                whichdayday = "Wednesday"
            } else if (whichday == 4){
                whichdayday = "Thursday"
            } else if (whichday == 5){
                whichdayday = "Friday"
            } else if (whichday == 6){
                whichdayday = "Saturday"
            } else if (whichday == 0){
                whichdayday = "Sunday"
            }

            var month;
            if (monthno == 0){
                month = "January"
            } else if (monthno == 1){
                month = "February"
            } else if (monthno == 2){
                month = "March"
            } else if (monthno == 3){
                month = "April"
            } else if (monthno == 4){
                month = "May"
            } else if (monthno == 5){
                month = "June"
            } else if (monthno == 6){
                month = "July"
            } else if (monthno == 7){
                month = "August"
            } else if (monthno == 8){
                month = "September"
            } else if (monthno == 9){
                month = "October"
            } else if (monthno == 10){
                month = "November"
            } else if (monthno == 11){
                month = "December"
            }

            var birthdaymsg = "Here is the birthday list\nToday's date : " + day + daymark + " " + month + " " + year + "\nFormat: Name - Birthdate - Current Age\n\n"
            var daymark; var month;
            var stream = Birthdays.find({}).stream();
            stream.on('data', function (doc) {
                var birthdayname = doc.name;
                var birthdatearray = doc.birthdate.split("/");
                var birthdateday = birthdatearray[0] * 1;
                var birthdatemonth = birthdatearray[1] * 1;
                var birthdateyear = birthdatearray[2] * 1;

                if (birthdateday == 1){
                    daymark = "st";
                } else if (birthdateday == 2) {
                    daymark = "nd";
                } else if (birthdateday == 3) {
                    daymark = "rd";
                } else {
                    daymark = "th";
                }

                if (birthdatemonth == 1){
                    month = "January"
                } else if (birthdatemonth == 2){
                    month = "February"
                } else if (birthdatemonth == 3){
                    month = "March"
                } else if (birthdatemonth == 4){
                    month = "April"
                } else if (birthdatemonth == 5){
                    month = "May"
                } else if (birthdatemonth == 6){
                    month = "June"
                } else if (birthdatemonth == 7){
                    month = "July"
                } else if (birthdatemonth == 8){
                    month = "August"
                } else if (birthdatemonth == 9){
                    month = "September"
                } else if (birthdatemonth == 10){
                    month = "October"
                } else if (birthdatemonth == 11){
                    month = "November"
                } else if (birthdatemonth == 12){
                    month = "December"
                }

                var birthdayage = doc.age;
                birthdaymsg = birthdaymsg + birthdayname + " - " + birthdateday + daymark + " " + month + " " + birthdateyear + " (" + birthdayage + ")\n"
            }).on('error', function (err) {
                if (err) throw error;
                ctx.telegram.sendMessage(ctx.message.from.id, "Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.")
            }).on('close', function () {
                callback(birthdaymsg);
            });
        },

        addBirthday: (ctx, callback) => {
            if (ctx.update.message.text == "/addBirthday") {
                var message = "Add birthday in this format.\n/addBirthday <b>name birthdate age</b>\n<code>e.g. /addBirthday BunBun 01/01/2010 6</code>"
                callback(message);
            } else {
                var info = ctx.update.message.text.replace('/addBirthday ','');
                var birthdayinfo = info.split(" ");
                var birthdayname = birthdayinfo[0];
                var birthdate = birthdayinfo[1];
                var birthage = birthdayinfo[2];
                Birthdays.update(
                    {
                      name : birthdayname
                    },
                    {
                        name: birthdayname,
                        birthdate: birthdate,
                        age: birthage
                    },
                    { upsert : true },
                    function(error,doc) {
                        if (error) throw error;
                        var message = birthdayname + " has been added to the birthday list";
                        callback(message);
                    }
                );
            }
        },

        addWeek: (ctx, callback) => {
            if (ctx.update.message.text == "/addWeek") {
                //Do Nothing
            } else {
                var weektoadd = ctx.update.message.text.replace('/addWeek ','');
                Weeks.update(
                    {
                       week : weektoadd
                    },
                    {
                        week : weektoadd,
                        weekid : weektoadd
                    },
                    { upsert : true },
                    function(error,doc) {
                        if (error) throw error;
                        var message = "Week " + weektoadd + " has been added successfully."
                        callback(message);
                    }
                );
            }
        },

        pastAttendance: (ctx) => {
            Weeks.count({}, function( err, currentweek){
                if (err) throw error;
                let choose_week_buttons = []
                // Turn all of the challenges into buttons
                Weeks.find({},(err, weeks) => {
                    if (err) throw err;
                    // Create the button menu
                    let choose_week_menu_markup = Extra
                    .HTML()
                    .markup((m) => {
                        let choose_week_menu_buttons = weeks.map((week) => {
                            var pastWeekCount = currentweek - week.week;
                            if (pastWeekCount === 0) {
                                return m.callbackButton("Current Week", 'choose_a_week_menu:'+ week.weekid + '')
                            } else if (pastWeekCount === 1) {
                                return m.callbackButton("Last Week", 'choose_a_week_menu:'+ week.weekid + '')
                            } else {
                                return m.callbackButton(pastWeekCount + " Weeks Ago", 'choose_a_week_menu:'+ week.weekid + '')
                            }
                        })
                        return m.inlineKeyboard( choose_week_menu_buttons , {columns: 2})
                    })
                    ctx.editMessageText('Choose week for attendance to display:', choose_week_menu_markup)
                })
            });
        },

        getSelectedWeekAttendance: (ctx, callback) => {
            var currentweek = ctx.session.selected_week
              var svc1Rnames = ""; var svc1Rcount = 0; var svc1count = 0;
              var svc1Inames = ""; var svc1Icount = 0; var svc2count = 0;
              var svc1Nnames = ""; var svc1Ncount = 0; var svc3count = 0;
              var svc1Gnames = ""; var svc1Gcount = 0; var attdmsg = "";
              var svc2Rnames = ""; var svc2Rcount = 0;
              var svc2Inames = ""; var svc2Icount = 0;
              var svc2Nnames = ""; var svc2Ncount = 0;
              var svc2Gnames = ""; var svc2Gcount = 0;
              var svc3Rnames = ""; var svc3Rcount = 0;
              var svc3Inames = ""; var svc3Icount = 0;
              var svc3Nnames = ""; var svc3Ncount = 0;
              var svc3Gnames = ""; var svc3Gcount = 0;
              var stream = Attendance.find({}).stream();
              stream.on('data', function (doc) {
                if (doc.week == currentweek){
                  if (doc.svcattending == "1"){
                      if (doc.status == "Regular"){
                          svc1Rnames = svc1Rnames + doc.name + "\n";
                          svc1Rcount = svc1Rcount + 1;
                          svc1count = svc1count + 1;
                      } else if (doc.status == "Integration"){
                          svc1Inames = svc1Inames + doc.name + "\n";
                          svc1Icount = svc1Icount + 1;
                          svc1count = svc1count + 1;
                      } else if (doc.status == "New Friend"){
                          svc1Nnames = svc1Nnames + doc.name + "\n";
                          svc1Ncount = svc1Ncount + 1;
                          svc1count = svc1count + 1;
                      } else if (doc.status == "Guest"){
                          svc1Gnames = svc1Gnames + doc.name + "\n";
                          svc1Gcount = svc1Gcount + 1;
                          svc1count = svc1count + 1;
                      }
                  } else if (doc.svcattending == "2"){
                      if (doc.status == "Regular"){
                          svc2Rnames = svc2Rnames + doc.name + "\n";
                          svc2Rcount = svc2Rcount + 1;
                          svc2count = svc2count + 1;
                      } else if (doc.status == "Integration"){
                          svc2Inames = svc2Inames + doc.name + "\n";
                          svc2Icount = svc2Icount + 1;
                          svc2count = svc2count + 1;
                      } else if (doc.status == "New Friend"){
                          svc2Nnames = svc2Nnames + doc.name + "\n";
                          svc2Ncount = svc2Ncount + 1;
                          svc2count = svc2count + 1;
                      } else if (doc.status == "Guest"){
                          svc2Gnames = svc2Gnames + doc.name + "\n";
                          svc2Gcount = svc2Gcount + 1;
                          svc2count = svc2count + 1;
                      }
                  } else if (doc.svcattending == "3"){
                      if (doc.status == "Regular"){
                          svc3Rnames = svc3Rnames + doc.name + "\n";
                          svc3Rcount = svc3Rcount + 1;
                          svc3count = svc3count + 1;
                      } else if (doc.status == "Integration"){
                          svc3Inames = svc3Inames + doc.name + "\n";
                          svc3Icount = svc3Icount + 1;
                          svc3count = svc3count + 1;
                      } else if (doc.status == "New Friend"){
                          svc3Nnames = svc3Nnames + doc.name + "\n";
                          svc3Ncount = svc3Ncount + 1;
                          svc3count = svc3count + 1;
                      } else if (doc.status == "Guest"){
                          svc3Gnames = svc3Gnames + doc.name + "\n";
                          svc3Gcount = svc3Gcount + 1;
                          svc3count = svc3count + 1;
                      }
                    }
                  }
              }).on('error', function (err) {
                  if (err) throw error;
                  ctx.telegram.sendMessage(ctx.message.from.id, "Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.")
              }).on('close', function () {
                  if (svc1count + svc2count + svc3count != 0){
                      attdmsg = "Here is the attendance for week " + currentweek + "\n\n"
                  } else {
                      attdmsg = "There was no attendance for that week"
                  }

                  if (svc1count > 0) {
                  attdmsg = "<b>Service 1 (" + svc1count + ")\nLeaders/Regulars (" + svc1Rcount + ")</b>\n" + svc1Rnames + "\n"
                  }
                  if (svc1Icount > 0) {
                  attdmsg = attdmsg + "<b>Integrations (" + svc1Icount + ")</b>\n" + svc1Inames + "\n"
                  }
                  if (svc1Ncount > 0) {
                  attdmsg = attdmsg + "<b>New Friends (" + svc1Ncount + ")</b>\n" + svc1Nnames + "\n"
                  }
                  if (svc1Gcount > 0) {
                  attdmsg = attdmsg + "<b>Guests (" + svc1Gcount + ")</b>\n" + svc1Gnames + "\n"
                  }

                  if (svc2count > 0) {
                      if (svc1count > 0){
                          attdmsg = attdmsg + "-----\n<b>Service 2 (" + svc2count+ ")</b>\n"
                      } else {
                          attdmsg = attdmsg + "<b>Service 2 (" + svc2count+ ")</b>\n"
                      }
                  }
                  if (svc2Rcount > 0) {
                  attdmsg = attdmsg + "<b>Leaders/Regulars (" + svc2Rcount + ")</b>\n" + svc2Rnames + "\n"
                  }
                  if (svc2Icount > 0) {
                  attdmsg = attdmsg + "<b>Integrations (" + svc2Icount + ")</b>\n" + svc2Inames + "\n"
                  }
                  if (svc2Ncount > 0) {
                  attdmsg = attdmsg + "<b>New Friends (" + svc2Ncount + ")</b>\n" + svc2Nnames + "\n"
                  }
                  if (svc2Gcount > 0) {
                  attdmsg = attdmsg + "<b>Guests (" + svc2Gcount + ")</b>\n" + svc2Gnames + "\n"
                  }

                  if (svc3count > 0) {
                      if (svc3count > 0) {
                          if (svc2count > 0 || svc1count > 0){
                              attdmsg = attdmsg + "-----\n<b>Service 3 (" + svc3count+ ")</b>\n"
                          } else {
                              attdmsg = attdmsg + "<b>Service 3 (" + svc3count+ ")</b>\n"
                          }
                      }
                  }
                  if (svc3Rcount > 0) {
                  attdmsg = attdmsg + "<b>Leaders/Regulars (" + svc3Rcount + ")</b>\n" + svc3Rnames + "\n"
                  }
                  if (svc3Icount > 0) {
                  attdmsg = attdmsg + "<b>Integrations (" + svc3Icount + ")</b>\n" + svc3Inames + "\n"
                  }
                  if (svc3Ncount > 0) {
                  attdmsg = attdmsg + "<b>New Friends (" + svc3Ncount + ")</b>\n" + svc3Nnames + "\n"
                  }
                  if (svc3Gcount > 0) {
                  attdmsg = attdmsg + "<b>Guests (" + svc3Gcount + ")</b>\n" + svc3Gnames + "\n"
                  }
                  callback(attdmsg)
              });
        },

        checkPersonExist: (ctx, callback) => {
            var nametoCheck = ctx.update.message.text.toLowerCase();
            Birthdays.findOne({"alias":nametoCheck}, (err, userInfo) => {
                if (err) throw err;
                if (userInfo != null){
                    callback(userInfo.toObject().status);
                } else {
                    callback(null);
                }
            })
        },

        setAdmin: (ctx, callback) => {
            var usernameForAdmin = ctx.update.message.text.replace('/setAdmin ','');
            Users.findOneAndUpdate({'username' : usernameForAdmin}, {'status' : 'Admin'}, {upsert:true}, function(err, doc){
                if (err) throw err;
                if (doc != null){
                    var msg = usernameForAdmin + " is now an Admin!"
                    callback(msg);
                } else {
                    var msg = usernameForAdmin + " does not exist!"
                    callback(msg);
                }
            });
        },

        removeAdmin: (ctx, callback) => {
            var usernameForRemoveAdmin = ctx.update.message.text.replace('/removeAdmin ','');
            Users.findOneAndUpdate({'username' : usernameForRemoveAdmin}, {'status' : 'Pending'}, {upsert:true}, function(err, doc){
                if (err) throw err;
                if (doc != null){
                    var msg = usernameForRemoveAdmin + " is no longer an Admin!"
                    callback(msg);
                } else {
                    var msg = usernameForRemoveAdmin + " does not exist!"
                    callback(msg);
                }
            });
        },

        setReceiver: (ctx, callback) => {
            var usernameForReceiver = ctx.update.message.text.replace('/setReceiver ','');
            Users.findOneAndUpdate({'username' : usernameForReceiver}, {'tosend' : 'true'}, {upsert:true}, function(err, doc){
                if (err) throw err;
                if (doc != null){
                    var msg = usernameForReceiver + " will now receive reminders!"
                    callback(msg);
                } else {
                    var msg = usernameForReceiver + " does not exist!"
                    callback(msg);
                }
            });
        },

        removeReceiver: (ctx, callback) => {
            var usernameForRemoveReceiver = ctx.update.message.text.replace('/removeReceiver ','');
            Users.findOneAndUpdate({'username' : usernameForRemoveReceiver}, {'tosend' : 'false'}, {upsert:true}, function(err, doc){
                if (err) throw err;
                if (doc != null){
                    var msg = usernameForRemoveReceiver + " will no longer receive reminders!"
                    callback(msg);
                } else {
                    var msg = usernameForRemoveReceiver + " does not exist!"
                    callback(msg);
                }
            });
        },

        toggleReminder: (ctx, callback) => {
            var telegramidForToggle = ctx.message.from.id;
            Users.findOne({'telegram_id' : telegramidForToggle}, (err, userInfo) => {
                if (err) throw err;
                if (userInfo != null){
                    if (userInfo.tosend == "true"){
                        Users.findOneAndUpdate({'telegram_id' : telegramidForToggle}, {'tosend' : 'false'}, {upsert:true}, function(err, doc){
                            if (err) throw err;
                            var msg = "Your reminders have been turned off."
                            callback(msg);
                        });
                    } else if (userInfo.tosend == "false"){
                        Users.findOneAndUpdate({'telegram_id' : telegramidForToggle}, {'tosend' : 'true'}, {upsert:true}, function(err, doc){
                            if (err) throw err;
                            var msg = "Your reminders have been turned on."
                            callback(msg);
                        });
                    } else {
                        Users.findOneAndUpdate({'telegram_id' : telegramidForToggle}, {'tosend' : 'false'}, {upsert:true}, function(err, doc){
                            if (err) throw err;
                            var msg = "Your reminders have been turned off."
                            callback(msg);
                        });
                    }
                } else {
                    var msg = "You are not registered in the system. Please contact @bennyboon for more information."
                    callback(msg);
                }
            });
        },

        broadcastMessage: (ctx, callback) => {
            var stream = Users.find({'status' : 'Admin'}).stream();
            stream.on('data', function (doc) {
                setTimeout(function(){
                      var broadcastMsg = "Message from : " + ctx.message.from.username + "\n\n" + ctx.session.message;
                      ctx.telegram.sendMessage(doc.telegram_id, broadcastMsg);
                  }, 1000)
            }).on('error', function (err) {
                if (err) throw error;
                ctx.telegram.sendMessage(ctx.message.from.id, "Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.")
            }).on('close', function () {
                //Do Nothing
            });
        },

        broadcastMessageDoc: (ctx, callback) => {
            var stream = Users.find({'status' : 'Admin'}).stream();
            stream.on('data', function (doc) {
                setTimeout(function(){
                      ctx.telegram.sendMessage(doc.telegram_id, "Document From : " + ctx.message.from.username);
                      ctx.telegram.sendDocument(doc.telegram_id, ctx.session.messageDoc);
                  }, 1000)
            }).on('error', function (err) {
                if (err) throw error;
                ctx.telegram.sendMessage(ctx.message.from.id, "Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.")
            }).on('close', function () {
                //Do Nothing
            });
        },

        broadcastMessageBot: (ctx, callback) => {
            var stream = Users.find({'status' : 'Admin'}).stream();
            stream.on('data', function (doc) {
                setTimeout(function(){
                      ctx.telegram.sendMessage(doc.telegram_id, ctx.session.message);
                  }, 1000)
            }).on('error', function (err) {
                if (err) throw error;
            }).on('close', function () {
                //Do Nothing
            });
        },

        broadcastMessageDocBot: (ctx, callback) => {
            var stream = Users.find({'status' : 'Admin'}).stream();
            stream.on('data', function (doc) {
                setTimeout(function(){
                      ctx.telegram.sendDocument(doc.telegram_id, ctx.session.messageDoc);
                  }, 1000)
            }).on('error', function (err) {
                if (err) throw error;
            }).on('close', function () {
                //Do Nothing
            });
        },

        userList: (ctx, callback) => {
            var userListmsg = "User List";
            var stream = Users.find({}).stream();
            stream.on('data', function (doc) {
                userListmsg = userListmsg + "\n\n<b>" + doc.username + "</b>\n" + doc.telegram_id + "\n" + doc.status + "\n" + doc.tosend;
            }).on('error', function (err) {
                if (err) throw error;
                ctx.telegram.sendMessage(ctx.message.from.id, "Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.")
            }).on('close', function () {
                callback(userListmsg);
            });
        },

}
