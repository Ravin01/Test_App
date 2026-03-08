import { StyleSheet } from "react-native";

export const colors={
    primaryColor:'#121212',
    SecondaryColor:'#1B1B1B',
    headLineColor:'#fff',
    textColor:'#777',
    whiteColor:'#fff',
    borderColor:'#F7CE45',
    primaryButtonColor:'#F7CE45',
    
}
export const notificationColors={
    background: '#121212',
    surfaceColor: '#1E1E1E',
    primaryText: '#FFFFFF',
    secondaryText: '#B0B0B0',
    subtleText: '#757575',
    divider: '#2C2C2C',
    accent: '#BB86FC',
    error: '#CF6679',
    icon: '#AEAEAE',
    yellow: '#FFD700',
    orange: '#FF8C00',
    green: '#4CAF50',
    blue: '#2196F3',
  };
  export const overlay = StyleSheet.create({
    cardOverlay:  {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    // backgroundColor:'red',
    padding: 7,
    justifyContent: 'space-between',
  },
shadowText:{
  textShadowColor: 'rgba(0, 0, 0, 0.8)',
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 4,
},
});