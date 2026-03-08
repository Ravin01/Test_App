import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, FlatList } from 'react-native';
const RoughWork =()=>{
  const [arr,setArr]=useState([{
    count:0
  },{
    count:0
  },{
    count:0
  }])
  const onPress=(index:number)=>{
    // console.log('Pressed index:', index);
    setArr(prev=>
      prev.map((item,i)=>i==index?{count:item.count+1}:item));
    // console.log('Updated array:', arr);
  }
  const Item=({item,index,onPress}:any)=>{
    return(
      <TouchableOpacity style={{height:100,width:100,backgroundColor:'red',margin:10,justifyContent:'center',alignItems:'center'}} onPress={()=>onPress(index)}>
        <Text style={{color:'white',fontSize:20}}>{item.count}</Text>
        </TouchableOpacity>
        )}

return(
  <View style={styles.container}>
    <FlatList
    data={arr}
    keyExtractor={(item,index)=>index.toString()}
    renderItem={({item,index})=><Item item={item} index={index} onPress={onPress} />}
    />
  </View>
)
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 300,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  playButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  rewindButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default RoughWork;