/**
 * проверяет живость сервера отчетов
 *
 * @module reports
 *
 * Created by Evgeniy Malyarov on 10.09.2018.
 */

const fetch = require('node-fetch');

module.exports = {
  name: 'reports',        // имя проверки в статистике
  order: 3,               // порядок исполнения проверки
  break_on_error: false,  // ошибка не связана с другими проверками
  mail_on: 2,             // если 2 раза подряд - пишем письмо
  reset: true,            // при повторении ошибки, выполнять перезапуск сервиса эскизов
  method (db, {http}) {
    if(!http) {
      return Promise.resolve({ok: true});
    }
    return fetch(http)
      .then(res => {
        if(res.status === 200) {
          return {ok: true};
        }
        else {
          const err = {status: res.status, message: res.statusText};
          console.error(err);
          return err;
        }
      })
      .catch((err) => {
        console.error(err);
        return err;
      });
  }
};