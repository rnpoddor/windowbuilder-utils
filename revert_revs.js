/**
 * ### Возвращает продукциям содержание
 * из последней непустой ревизии
 *
 * @module revert_revs
 *
 * Created by Evgeniy Malyarov on 25.10.2018.
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * ZONE 21
 * DBPWD admin
 * DBUSER admin
 * COUCHPATH http://cou221:5984/wb_
 */

'use strict';

const debug = require('debug')('wb:revert');
const PouchDB = require('./pouchdb')
  .plugin(require('pouchdb-find'));

debug('required');

// инициализируем параметры сеанса и метаданные
const {DBUSER, DBPWD, COUCHPATH, ZONE} = process.env;
const prefix = 'wb_';
const start = '2018-10-23T16';
const blank_guid = '00000000-0000-0000-0000-000000000000';
const stat = {
  doc_count: 0,
  prod_count: 0,
  err_prods: [],
  err_docs: [],
};

const src = new PouchDB(`${COUCHPATH}${ZONE}_doc`, {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  skip_setup: true,
  ajax: {timeout: 100000}
});

src.info()
  .then((info) => {
    debug(`connected to ${info.host}, doc count: ${info.doc_count}`);
    return process_fragment();
  })
  .then((res) => {
    debug('all done');
  })
  .catch(err => {
    debug(err)
  });

// дописывает в файл информацию об обработанном заказе
function write_log(doc) {

}

// обрабатывает заказы пачками по 100
function process_fragment(bookmark) {
  return src.find({
    selector: {
      class_name: 'doc.calc_order',
      date: {$gte: '2018-10-23'},
      search: {$gte: null}
    },
    limit: 100,
    bookmark,
    fields: ['_id', 'date', 'number_doc', 'production']
  })
    .then(({docs, bookmark}) => {
      return docs.reduce(process_doc, Promise.resolve())
        .then(() => {
          if(docs.length === 100) {
            return process_fragment(bookmark);
          }
        });
    });
}

// обрабатывает конкретный документ
function process_doc(sum, doc) {
  return sum.then(() => load_production(doc)
    .then((prod) => {
      if(prod.length) {
        stat.err_docs.push(doc);
      }
      return prod.reduce(revert_production, Promise.resolve());
    }));
}

// читает продукцию заказа
function load_production(doc) {
  stat.doc_count++;
  if(doc.production) {
    const keys = doc.production
      .filter(({characteristic}) => characteristic && characteristic !== blank_guid)
      .map(({characteristic}) => `cat.characteristics|${characteristic}`);
    return src.allDocs({keys, include_docs: true})
      .then(({rows}) => {
        stat.prod_count += rows.length;
        return rows
          .filter((row) => row.doc && !row.doc.specification)
          .map((row) => row.doc);
      });
  }
  return Promise.resolve();
}

// контролирует заполненность и пытается восстановить из версии
function revert_production(sum, ox) {
  return sum.then(() => {
    stat.err_prods.push(ox);
  });
}