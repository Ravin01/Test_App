import { NavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

class RootNavigation {
  private static navigationRef: NavigationContainerRef<RootStackParamList> | null = null;

  static setNavigationRef(ref: NavigationContainerRef<RootStackParamList>) {
    this.navigationRef = ref;
  }

  static navigate(name: keyof RootStackParamList, params?: any) {
    if (this.navigationRef?.isReady()) {
      this.navigationRef.navigate(name, params);
    } else {
      console.warn('Navigation ref not ready for:', name);
    }
  }

  static goBack() {
    if (this.navigationRef?.isReady() && this.navigationRef.canGoBack()) {
      this.navigationRef.goBack();
    }
  }

  static reset(state: any) {
    if (this.navigationRef?.isReady()) {
      this.navigationRef.reset(state);
    }
  }

  static getCurrentRoute() {
    if (this.navigationRef?.isReady()) {
      return this.navigationRef.getCurrentRoute();
    }
    return null;
  }

  static isReady() {
    return this.navigationRef?.isReady() || false;
  }
}

export default RootNavigation;