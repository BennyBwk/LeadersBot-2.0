//--------MODULE IMPORTS---------------
const Telegraf = require('telegraf');
const TelegrafFlow = require('telegraf-flow')
const {Extra, Markup} = require('telegraf');
const {memorySession} = require('telegraf');
const cron = require('node-cron');
const {bot} = require('../bot.js');
const {simpleRouter} = require('../router/router.js');
const Users = require('../../models/Users.js');
const Files = require('../../models/Files.js');
const Attendance = require('../../models/Attendance.js');
const Weeks = require('../../models/Weeks.js');
const Birthdays = require('../../models/Birthdays.js');
const homeHelper = require('./helpers/homeHelper.js');
const Promise = require('bluebird');
const {Scene} = TelegrafFlow;

const flow = new TelegrafFlow()
const superUserTelegramID = "19663241";
bot.use(flow)
bot.use(simpleRouter)

var versionNo = "2.0";
var lastUpdated = "8th April 2018 3:52AM"

var helpInfoMsg = "<b>BE5 Leaders Bot Help</b>\n<code>Version " + versionNo + "\nLast Updated: " + lastUpdated + "</code>\n\n";
helpInfoMsg = helpInfoMsg + "<b>Commands</b>";
helpInfoMsg = helpInfoMsg + "\n<code>/start</code> - register with the bot";
helpInfoMsg = helpInfoMsg + "\n<code>/menu</code> - view the main menu";
helpInfoMsg = helpInfoMsg + "\n<code>/remove</code> - remove someone from the attendance";
helpInfoMsg = helpInfoMsg + "\n<code>/toggleReminder</code> - toggle on/off for attendance reminder";
helpInfoMsg = helpInfoMsg + "\n<code>/help</code> - what you are doing now";
helpInfoMsg = helpInfoMsg + "\n<code>/checkVersion</code> - check current version of bot";
helpInfoMsg = helpInfoMsg + "\n\n<b>Additional Features</b>";
helpInfoMsg = helpInfoMsg + "\n<code>Birthday Reminder</code> - 12mn on the day itself";
helpInfoMsg = helpInfoMsg + "\n<code>Attendance Reminder</code> - every thursdays at 12pm";
helpInfoMsg = helpInfoMsg + "\n\nFor any enquiry or suggestions, please contact @bennyboon";

//---------USE ROUTER-----------
bot.on('callback_query', simpleRouter.middleware());

bot.command('checkVersion', (ctx) => {
    try {
        ctx.replyWithHTML("BE5 Leaders Bot\nVersion " + versionNo + "\nLast Updated: " + lastUpdated);
    } catch (err) {
        console.log(err)
        ctx.replyWithHTML("Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.");
    }
});

bot.command('help', (ctx) => {
    homeHelper.checkIfAdmin(ctx, function(userObject){
        if (userObject != undefined){
            if (userObject.status == "Admin") {
              try {
                    ctx.replyWithHTML(helpInfoMsg);
                } catch (err) {
                    console.log(err)
                    ctx.replyWithHTML("Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.");
                }
            }
        }
    });
});

bot.command('start', (ctx) => {
    try {
        homeHelper.checkUserAlreadyExists( ctx, function(user){
            ctx.replyWithHTML("Welcome to BE5 Leaders Bot!\nChecking your identity...");
            var message = user;
            setTimeout(function(){
                    ctx.replyWithHTML(message);
                }, 2000)
        });
    } catch (err) {
        console.log(err)
        ctx.replyWithHTML("Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.");
    }
});

const addattendanceScene = new Scene('addattendance')
addattendanceScene.enter((ctx) => ctx.editMessageText('Please enter the name of the person'))
addattendanceScene.on('text', (ctx) => {
    if (ctx.message.text === "/menu") {
       ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
       ctx.flow.leave()
     } else {
        ctx.session.name = ctx.message.text
        ctx.session.messagefrom = ctx.message.from.username
        ctx.session.messagefromid = ctx.message.from.id
        homeHelper.checkPersonExist( ctx, function(existInfo){
            if (existInfo == null){
                ctx.reply("What is his/her status?", select_status_markup)
                ctx.flow.leave()
            } else {
                ctx.session.selected_status = existInfo
                homeHelper.updateAttendance(ctx, function(msg){
                  ctx.replyWithHTML(msg);
                  ctx.flow.enter('addattendanceagain')
                })
            }
        })
    }
})

flow.register(addattendanceScene)

const addattendanceagainScene = new Scene('addattendanceagain')
addattendanceagainScene.enter((ctx) => ctx.replyWithHTML('Please enter the next person for this service\nYou may type "EXIT" to return to main menu'))
addattendanceagainScene.on('text', (ctx) => {
  if (ctx.message.text.toUpperCase() === "EXIT") {
      ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
      ctx.flow.leave()
  } else if (ctx.message.text === "/menu") {
      ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
      ctx.flow.leave()
  } else {
      ctx.session.name = ctx.message.text
      ctx.session.messagefrom = ctx.message.from.username
      ctx.session.messagefromid = ctx.message.from.id
      homeHelper.checkPersonExist( ctx, function(existInfo){
          if (existInfo == null){
              ctx.reply("What is his/her status?", select_status_markup)
              ctx.flow.leave()
          } else {
              ctx.session.selected_status = existInfo
              homeHelper.updateAttendance(ctx, function(msg){
                ctx.replyWithHTML(msg);
                ctx.flow.enter('addattendanceagain')
              })
          }
      })
  }
})

flow.register(addattendanceagainScene)

let select_status_markup = Extra
.HTML()
.markup((m) => m.inlineKeyboard([
  m.callbackButton('Regular', 'select_status_markup:regular'),
  m.callbackButton('Integration', 'select_status_markup:integration'),
  m.callbackButton('New Friend', 'select_status_markup:new_friend'),
  m.callbackButton('Guest', 'select_status_markup:guest')
], {columns: 2}));

simpleRouter.on('select_status_markup', (ctx) => {
  switch(ctx.state.value){
    case "regular":
      ctx.session.selected_status = "Regular"
      homeHelper.updateAttendance(ctx, function(msg){
        ctx.editMessageText(msg)
        ctx.flow.enter('addattendanceagain')
      })
    break;
    case "integration":
      ctx.session.selected_status = "Integration"
      homeHelper.updateAttendance(ctx, function(msg){
        ctx.editMessageText(msg)
        ctx.flow.enter('addattendanceagain')
      })
    break;
    case "new_friend":
      ctx.session.selected_status = "New Friend"
      homeHelper.updateAttendance(ctx, function(msg){
        ctx.editMessageText(msg)
        ctx.flow.enter('addattendanceagain')
      })
    break;
    case "guest":
      ctx.session.selected_status = "Guest"
      homeHelper.updateAttendance(ctx, function(msg){
        ctx.editMessageText(msg)
        ctx.flow.enter('addattendanceagain')
      })
    break;
    default:
  };
});

let select_service_markup = Extra
.HTML()
.markup((m) => m.inlineKeyboard([
  m.callbackButton('Service 1', 'select_service_markup:service_1'),
  m.callbackButton('Service 2', 'select_service_markup:service_2'),
  m.callbackButton('Service 3', 'select_service_markup:service_3'),
], {columns: 1}));

simpleRouter.on('select_service_markup', (ctx) => {
  switch(ctx.state.value){
    case "service_1":
      ctx.session.selected_svc = 1
      ctx.flow.enter('addattendance')
    break;
    case "service_2":
      ctx.session.selected_svc = 2
      ctx.flow.enter('addattendance')
    break;
    case "service_3":
      ctx.session.selected_svc = 3
      ctx.flow.enter('addattendance')
    break;
    default:
  };
});

simpleRouter.on('choose_a_week_menu', (ctx) => {
    switch(ctx.state.value){
    default:
      ctx.session.selected_week = ctx.state.value;
      console.log(ctx.state.value);
      homeHelper.getSelectedWeekAttendance(ctx, function(msg){
          ctx.replyWithHTML(msg);
      });
    }
});

let public_main_menu_markup = Extra
.HTML()
.markup((m) => m.inlineKeyboard([
  m.callbackButton('🗒 View Attendance', 'main_public_menu:view_attendance'),
  m.callbackButton('📝 Add Attendance', 'main_public_menu:add_attendance'),
  m.callbackButton('🎉 Birthday List', 'main_public_menu:birthday_list'),
  m.callbackButton('🕑 Past Attendance', 'main_public_menu:past_attendance'),
  m.callbackButton('🔈 Broadcast Message', 'main_public_menu:broadcast_message'),
  m.callbackButton('📖 View Bot Help', 'main_public_menu:view_help')
], {columns: 2}));

simpleRouter.on('main_public_menu', (ctx) => {

  switch(ctx.state.value){
    case "view_attendance":
      homeHelper.getAttendance(ctx, function(msg){
        ctx.replyWithHTML(msg)
      })
      break;
    case "add_attendance":
      ctx.editMessageText("Update for which service?", select_service_markup);
      break;
    case "birthday_list":
      homeHelper.getBirthdayList(ctx, function(birthdaylist){
        ctx.editMessageText(birthdaylist);
      })
      break;
    case "past_attendance":
      homeHelper.pastAttendance(ctx);
      break;
    case "broadcast_message":
      ctx.flow.enter('broadcast')
      break;
    case "view_help":
      try {
          ctx.replyWithHTML(helpInfoMsg);
      } catch (err) {
          console.log(err)
          ctx.replyWithHTML("Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.");
      }
      break;
    default:
  }

});

bot.command('menu', (ctx) => {
    homeHelper.checkIfAdmin(ctx, function(userObject){
        if (userObject != undefined){
            if (userObject.status == "Admin") {
              try {
                  ctx.session.my_telegram_id = ctx.update.message.from.id
                  ctx.session.public_main_menu_markup = public_main_menu_markup
                  ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
              } catch(err) {
                  console.log(err)
                  console.log("/menu err on telegram id: " + ctx.message.from.id + " username: " + ctx.message.from.username );
                  ctx.replyWithHTML("Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.");
              }
            } else {
                ctx.replyWithHTML("You do not have access to this function. Please contact @bennyboon for more information.")
            }
        }
    })
});

bot.command('remove', (ctx) => {
    homeHelper.checkIfAdmin(ctx, function(userObject){
        if (userObject != undefined){
            if (userObject.status == "Admin") {
                homeHelper.removeAttendance(ctx, function(callback){
                    ctx.replyWithHTML(callback);
                })
            }
        }
    });
});

/*
bot.command('addBirthday', (ctx) => {
    homeHelper.checkIfAdmin(ctx, function(userObject){
        if (userObject != undefined){
            if (userObject.status == "Admin") {
                homeHelper.addBirthday(ctx, function(callback){
                    ctx.replyWithHTML(callback);
                })
            }
        }
    });
}); */

bot.command('clog', (ctx) => {
    if (ctx.update.message.text == "/clog") {
    } else {
        var clogmsg = ctx.update.message.text.replace('/clog ','');
        console.log(clogmsg);
    }
});

bot.command('addWeek', (ctx) => {
    if (ctx.update.message.text == "/addWeek"){
        //Do nothing
    } else {
        homeHelper.checkIfAdmin(ctx, function(userObject){
            if (userObject != undefined){
                if (userObject.status == "Admin"){
                    if (ctx.message.from.id == superUserTelegramID){
                        homeHelper.addWeek(ctx, function(callback){
                            ctx.replyWithHTML(callback);
                        });
                    }
                }
            }
        });
    }
});

bot.command('setAdmin', (ctx) => {
    if (ctx.update.message.text == "/setAdmin"){
        //Do nothing
    } else {
        homeHelper.checkIfAdmin(ctx, function(userObject){
            if (userObject != undefined){
                if (userObject.status == "Admin"){
                    if (ctx.message.from.id == superUserTelegramID){
                        homeHelper.setAdmin(ctx, function(callback){
                            ctx.replyWithHTML(callback);
                        });
                    }
                }
            }
        });
    }
});

bot.command('removeAdmin', (ctx) => {
    if (ctx.update.message.text == "/removeAdmin"){
        //Do nothing
    } else {
        homeHelper.checkIfAdmin(ctx, function(userObject){
            if (userObject != undefined){
                if (userObject.status == "Admin"){
                    if (ctx.message.from.id == superUserTelegramID){
                        homeHelper.removeAdmin(ctx, function(callback){
                            ctx.replyWithHTML(callback);
                        });
                    }
                }
            }
        });
    }
});

bot.command('setReceiver', (ctx) => {
    if (ctx.update.message.text == "/setReceiver"){
        //Do nothing
    } else {
        homeHelper.checkIfAdmin(ctx, function(userObject){
            if (userObject != undefined) {
                if (userObject.status == "Admin"){
                    if (ctx.message.from.id == superUserTelegramID){
                        homeHelper.setReceiver(ctx, function(callback){
                            ctx.replyWithHTML(callback);
                        });
                    }
                }
            }
        });
    }
});

bot.command('removeReceiver', (ctx) => {
    if (ctx.update.message.text == "/removeReceiver"){
        //Do nothing
    } else {
        homeHelper.checkIfAdmin(ctx, function(userObject){
            if (userObject != undefined) {
                if (userObject.status == "Admin"){
                    if (ctx.message.from.id == superUserTelegramID){
                        homeHelper.removeReceiver(ctx, function(callback){
                            ctx.replyWithHTML(callback);
                        });
                    }
                }
            }
        });
    }
});

bot.command('toggleReminder', (ctx) => {
    homeHelper.checkIfAdmin(ctx, function(userObject){
        if (userObject != undefined){
            if (userObject.status == "Admin"){
                homeHelper.toggleReminder(ctx, function(callback){
                    ctx.replyWithHTML(callback);
                });
            }
        }
    });
})

const broadcastScene = new Scene('broadcast')
broadcastScene.enter((ctx) => ctx.replyWithHTML('Please send me the <b>message</b> or <b>document</b> to broadcast\n<code>Message will be send to all Leaders using this Bot.\nType CANCEL to cancel.</code>'))
broadcastScene.on('text', (ctx) => {
    if (ctx.message.text.toUpperCase() === "CANCEL") {
        ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        ctx.flow.leave()
    } else {
        ctx.session.message = ctx.message.text
        homeHelper.broadcastMessage(ctx, function(userObject){
        })
    ctx.flow.leave()
    }
})
broadcastScene.on('document', (ctx) => {
    ctx.session.messageDoc = ctx.message.document.file_id
    homeHelper.broadcastMessageDocBot(ctx, function(userObject){
    })
    ctx.flow.leave()
})

//broadcastMessageDoc

flow.register(broadcastScene)

bot.command('broadcastBot', (ctx) => {
    homeHelper.checkIfAdmin(ctx, function(userObject){
        if (userObject != undefined){
            if (userObject.status == "Admin"){
                if (ctx.message.from.id == superUserTelegramID){
                    ctx.flow.enter('broadcastBot')
                }
            }
        }
    });
});

const broadcastBotScene = new Scene('broadcastBot')
broadcastBotScene.enter((ctx) => ctx.replyWithHTML('Please send me the <b>message</b> or <b>document</b> to broadcast\n<code>Type CANCEL to cancel.</code>'))
broadcastBotScene.on('text', (ctx) => {
    if (ctx.message.text.toUpperCase() === "CANCEL") {
        ctx.replyWithHTML("You may choose one of the following options:", public_main_menu_markup);
        ctx.flow.leave()
    } else {
        ctx.session.message = ctx.message.text
        homeHelper.broadcastMessageBot(ctx, function(userObject){
        })
    ctx.flow.leave()
    }
})
broadcastBotScene.on('document', (ctx) => {
    ctx.session.messageDoc = ctx.message.document.file_id
    homeHelper.broadcastMessageDocBot(ctx, function(userObject){
    })
    ctx.flow.leave()
})

flow.register(broadcastBotScene)

bot.command('activateCron', (ctx) => {
    homeHelper.checkIfAdmin(ctx, function(userObject){
        if (userObject != undefined){
            if (userObject.status == "Admin") {
                if (ctx.message.from.id == superUserTelegramID){
                    homeHelper.do_cron(ctx)
                    ctx.replyWithHTML("Cron have been activated successfully!");
                }
            }
        }
    });
});

bot.command('cmdList', (ctx) => {
    homeHelper.checkIfAdmin(ctx, function(userObject){
        if (userObject != undefined){
            if (userObject.status == "Admin") {
                if (ctx.message.from.id == superUserTelegramID){
                    var cmdList = "<b>Super Admin Command List</b>\n"
                    cmdList = cmdList + "\n<code>/start</code> - register with the bot"
                    cmdList = cmdList + "\n<code>/menu</code> - view the main menu"
                    cmdList = cmdList + "\n<code>/remove</code> - remove someone from the attendance"
                    cmdList = cmdList + "\n<code>/toggleReminder</code> - toggle on/off for attendance reminder"
                    cmdList = cmdList + "\n<code>/help</code> - view help for bot"
                    cmdList = cmdList + "\n<code>/cmdList</code> - what you are doing now"
                    cmdList = cmdList + "\n<code>/checkVersion</code> - check current version of bot"
                    cmdList = cmdList + "\n<code>/activateCron</code> - start all crons on bot"
                    cmdList = cmdList + "\n<code>/broadcastBot</code> - broadcast to all without a name"
                    cmdList = cmdList + "\n<code>/setReceiver</code> - set a user's notification to true"
                    cmdList = cmdList + "\n<code>/removeReceiver</code> - set a user's notification to false"
                    cmdList = cmdList + "\n<code>/setAdmin</code> - set a user to be admin"
                    cmdList = cmdList + "\n<code>/removeAdmin</code> - remove admin from a user"
                    cmdList = cmdList + "\n<code>/users</code> - view all users in database"
                    cmdList = cmdList + "\n<code>/clog</code> - send text to console"
                    cmdList = cmdList + "\n\n<b>Additional Features</b>"
                    cmdList = cmdList + "\n<code>Birthday Reminder</code> - 12mn on the day itself"
                    cmdList = cmdList + "\n<code>Attendance Reminder</code> - every thursdays at 12pm"
                    cmdList = cmdList + "\n<code>Auto Create Week</code> - every sunday at 12mn"
                    cmdList = cmdList + "\n<code>Auto Update Age</code> - once a birthdate reaches"
                    ctx.replyWithHTML(cmdList);
                }
            }
        }
    });
});

bot.command('users', (ctx) => {
    homeHelper.checkIfAdmin(ctx, function(userObject){
        if (userObject != undefined){
            if (userObject.status == "Admin"){
                if (ctx.message.from.id == superUserTelegramID){
                    homeHelper.userList(ctx, function(callback){
                        ctx.replyWithHTML(callback);
                    });
                }
            }
        }
    });
});

/*
bot.on('document', (ctx, next) => {
    if (homeHelper.isAdmin_normal(ctx)){
        homeHelper.addDocumentToDatabase(ctx).then((doneObject)=>{
            return ctx.replyWithHTML("File Added Successfully!");
        });
    } else {
        return ctx.replyWithHTML("<i>This command is not available.</i> ");
    }
});

bot.command('clearFiles', (ctx) => {
    try {
        Files.remove({},function(done){
            ctx.replyWithHTML("File(s) Cleared Successfully!");
        })
    } catch (err) {
        console.log(err)
        ctx.replyWithHTML("Oops! We are sorry that an error has occured but we are already looking into it. Please try again later.");
    }
});

bot.command('getFiles', (ctx) => {
    const getFilesScene = new Scene('getFiles')
    ctx.flow.enter('getFiles')

    getFilesScene.enter((ctx) => ctx.reply('Please enter the password to receive the files for 60 Day Goals Meeting.'))
    getFilesScene.on('text', (ctx) => {
        if (ctx.message.text.toLowerCase() === 'upsidedownfaith') {
            ctx.flow.leave()
            homeHelper.getFileAndSend(ctx)
        } else {
            ctx.reply('The password is incorrect!')
            ctx.flow.leave()
            ctx.flow.enter('getFiles')
        }
    })
});
*/
