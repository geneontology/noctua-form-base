import * as _ from 'lodash';
const each = require('lodash/forEach');

export class AnnotonError {
  category;
  type;
  message;
  meta;

  constructor(category, type, message, meta) {
    this.category = category;
    this.type = type;
    this.message = message;
    this.meta = meta;
  }
}