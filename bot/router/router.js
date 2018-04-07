const Telegraf = require('telegraf');
const { Extra, Markup, Router} = require('telegraf');

//-----------ROUTER----------

// Router staff
const simpleRouter = new Router((ctx) => {
  if (!ctx.callbackQuery || !ctx.callbackQuery.data) {
    return Promise.resolve()
  }
  const parts = ctx.callbackQuery.data.split(':')
  return Promise.resolve({
    route: parts[0],
    state: {
      value: parts[1]
    }
  })
})

//---------BUTTON TEXT ~> Route:State--------------

//---------- For admin.js-----------

const setPasswordMarkup = Extra
.HTML()
.markup((m) => m.inlineKeyboard([
    m.callbackButton('1', 'authoriseInteger:1'),
    m.callbackButton('2 (abc)', 'authoriseInteger:2'),
    m.callbackButton('3 (def)', 'authoriseInteger:3'),
    m.callbackButton('4 (ghi)', 'authoriseInteger:4'),
    m.callbackButton('5 (jkl)', 'authoriseInteger:5'),
    m.callbackButton('6 (mno)', 'authoriseInteger:6'),
    m.callbackButton('7 (pqrs)', 'authoriseInteger:7'),
    m.callbackButton('8 (tuv)', 'authoriseInteger:8'),
    m.callbackButton('9 (wxyz)', 'authoriseInteger:9'),
    m.callbackButton('reset', 'authoriseString:reset'),
    m.callbackButton('0', 'authoriseInteger:0'),
    m.callbackButton('backspace', 'authoriseString:backspace'),
    m.callbackButton('submit', 'authoriseString:submit')
], {columns: 3}));

const loginPasswordMarkup = Extra
.HTML()
.markup((m) => m.inlineKeyboard([
    m.callbackButton('1', 'loginInteger:1'),
    m.callbackButton('2 (abc)', 'loginInteger:2'),
    m.callbackButton('3 (def)', 'loginInteger:3'),
    m.callbackButton('4 (ghi)', 'loginInteger:4'),
    m.callbackButton('5 (jkl)', 'loginInteger:5'),
    m.callbackButton('6 (mno)', 'loginInteger:6'),
    m.callbackButton('7 (pqrs)', 'loginInteger:7'),
    m.callbackButton('8 (tuv)', 'loginInteger:8'),
    m.callbackButton('9 (wxyz)', 'loginInteger:9'),
    m.callbackButton('reset', 'loginString:reset'),
    m.callbackButton('0', 'loginInteger:0'),
    m.callbackButton('backspace', 'loginString:backspace'),
    m.callbackButton('submit', 'loginString:submit')
], {columns: 3}));

module.exports = {
    simpleRouter: simpleRouter,
    loginPasswordMarkup: loginPasswordMarkup,
    setPasswordMarkup: setPasswordMarkup
};
