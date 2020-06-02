import { environment } from '../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Contributor } from '../models/contributor';
import { Group } from '../models/group';


@Injectable({
  providedIn: 'root'
})
export class NoctuaUserService {
  private _baristaToken: string;
  baristaUrl = environment.globalBaristaLocation;
  onUserChanged: BehaviorSubject<any>;
  user: Contributor;
  contributors: Contributor[] = [];
  groups: Group[] = [];

  constructor(
    private httpClient: HttpClient) {
    this.onUserChanged = new BehaviorSubject(null);
  }

  set baristaToken(value) {
    this._baristaToken = value;
    localStorage.setItem('barista_token', value);
  }

  get baristaToken() {
    return this._baristaToken;
  }

  getUser() {
    const self = this;

    return this.httpClient.get(`${self.baristaUrl}/user_info_by_token/${self.baristaToken}`)
      .subscribe((response: any) => {
        if (response && response.token) {
          this.user = new Contributor();
          this.user.name = response.nickname;
          this.user.groups = response.groups;
          // user.manager.use_groups([self.userInfo.selectedGroup.id]);
          this.user.token = response.token;
          this.user = this.user;
          this.onUserChanged.next(this.user);
        } else {
          this.user = null;
          this.user = this.user;
          this.onUserChanged.next(this.user);
        }
      });
  }



  getUsers(): Observable<any> {
    const self = this;

    return this.httpClient.get(`${self.baristaUrl}/users`);
  }

  getUserInfo(uri: string): Observable<any> {
    const self = this;

    const encodedUrl = encodeURIComponent(uri);
    return this.httpClient.get(`${self.baristaUrl}/user_info_by_id/${encodedUrl}`);
  }

  getGroups(): Observable<any> {
    const self = this;

    return this.httpClient.get(`${self.baristaUrl}/groups`);
  }

  getGroupInfo(uri: string): Observable<any> {
    const self = this;

    const encodedUrl = encodeURIComponent(uri);
    return this.httpClient.get(`${self.baristaUrl}/group_info_by_id/${encodedUrl}`);
  }

  filterContributors(value: string): any[] {
    const filterValue = value.toLowerCase();

    return this.contributors.filter((contributor: Contributor) => contributor.name.toLowerCase().indexOf(filterValue) === 0);
  }

  filterGroups(value: string): any[] {
    const filterValue = value.toLowerCase();

    return this.groups.filter((group: Group) => group.name.toLowerCase().indexOf(filterValue) === 0);
  }
}
