import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';

import App from './App';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
	if (remoteMessage?.data) {
		console.log('Background notification received:', remoteMessage.data);
	}
});

registerRootComponent(App);
