import { makeAutoObservable, action } from "mobx";

export class UserStore {
  avatarUrl: string = "";
  hasLoggedIn: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }

  @action
  setAvatarUrl(url: string) {
    this.avatarUrl = url;
  }

  @action
  setLoggedIn(status: boolean) {
    this.hasLoggedIn = status;
  }
}

// 创建并导出UserStore实例
export const userStore = new UserStore();
