import * as _ from 'lodash';
declare const require: any;
const uuid = require('uuid/v1');

export class TermLookup {
  category: string
  requestParams: any;

  constructor(category?: string, requestParams?: any) {
    this.category = category;
    this.requestParams = requestParams;
  }

}