import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
// import LottieView from 'lottie-react-native';

function ShipperOrders({navigation}) {
  return (
    <View style={{padding:20}}>
        <TouchableOpacity onPress={()=>navigation.goBack()}>
            <Text>Back</Text>
        </TouchableOpacity>
      <Text>Still Pending</Text>
      {/* <LottieView
  source={require('../../assets/animations/1744441448343.json')}
  style={{height:'100%',width:'100%'}}
  // onAnimationFinish={}
  autoPlay
  loop
/> */}
    </View>
  )
}

export default ShipperOrders
