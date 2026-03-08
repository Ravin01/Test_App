import React, {useRef, useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import ToggleSwitch from 'toggle-switch-react-native';
import SimulcastConfigModal from './SimulcastConfigModal';

const {width} = Dimensions.get('window');

export default function SimulcastBottomSheet({isOpen, setIsOpen, streamId, streamData, onSimulcastUpdate}) {
  // If parent passes ref, use that, otherwise create local ref
  const refRBSheet = useRef();

  const [youtubeEnabled, setYoutubeEnabled] = useState(true);
  const [instagramKey, setInstagramKey] = useState('');

    // --- OPEN / CLOSE ---
    useEffect(() => {
      if (isOpen) {        
        refRBSheet.current.open();
      } else {
        refRBSheet.current.close();
      }
    }, [isOpen]);

  return (
    <RBSheet
      ref={refRBSheet}
      height={520}
      openDuration={250}
      closeOnDragDown={true}
      draggable={true}
      onClose={() => setIsOpen(false)}
      customStyles={{
        container: styles.sheetContainer,
        wrapper: styles.wrapper,
        draggableIcon: {backgroundColor: '#444'},
      }}>
      <View style={styles.inner}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Stream to Other Platforms</Text>
          <TouchableOpacity
            onPress={() => setIsOpen(false)}
            style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        </View>
           <SimulcastConfigModal
            // visible={modals?.isSimulcastVisible}
           //  onClose={() => toggleModal('isSimulcastVisible')}
            streamId={streamId}
            streamData={streamData}
            onSimulcastUpdate={onSimulcastUpdate}
          />
      </View>
    </RBSheet>
  );
}

const styles = StyleSheet.create({
  wrapper: {backgroundColor: 'rgba(0,0,0,0.5)'},
  sheetContainer: {
    backgroundColor: '#1f1f1f',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  inner: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 8,
    top: -10,
    padding: 8,
  },
  closeText: {fontSize: 22, color: '#cfcfcf'},
  scroll: {
    marginTop: 6,
  },
  card: {
    backgroundColor: '#2b2b2b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    minHeight: 86,
    justifyContent: 'center',
  },
  cardRow: {flexDirection: 'row', alignItems: 'center'},
  iconWrapperYouTube: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperInstagram: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#2d2d2d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperFacebook: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {color: '#fff', fontWeight: '700', fontSize: 18},
  cardTitle: {color: '#fff', fontSize: 16, fontWeight: '700'},
  cardSubtitleRed: {color: '#ff6666', marginTop: 4},
  cardSubtitleGreen: {color: '#3cd278', marginTop: 4},
  enableLabel: {color: '#bdbdbd', marginBottom: 6, textAlign: 'right'},
  input: {
    borderRadius: 8,
    backgroundColor: '#222',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 8,
    color: '#fff',
  },
  purpleButton: {
    marginTop: 10,
    backgroundColor: '#5b2e86',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
   redButton: {
    alignSelf: 'flex-end',
    width: '82%',
    marginTop: 10,
    backgroundColor: 'red',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  purpleButtonText: {color: '#fff', fontWeight: '700'},
  blueButton: {
    marginTop: 10,
    backgroundColor: '#2b8cff',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    width: 140,
  },
  blueButtonText: {color: '#fff', fontWeight: '700'},
});






// import React, {useRef, useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   TextInput,
//   ScrollView,
//   Dimensions,
// } from 'react-native';
// import RBSheet from 'react-native-raw-bottom-sheet';
// import ToggleSwitch from 'toggle-switch-react-native';

// const {width} = Dimensions.get('window');

// export default function SimulcastBottomSheet({isOpen, setIsOpen}) {
//   // If parent passes ref, use that, otherwise create local ref
//   const refRBSheet = useRef();

//   const [youtubeEnabled, setYoutubeEnabled] = useState(true);
//   const [instagramKey, setInstagramKey] = useState('');

//     // --- OPEN / CLOSE ---
//     useEffect(() => {
//       if (isOpen) {        
//         refRBSheet.current.open();
//       } else {
//         refRBSheet.current.close();
//       }
//     }, [isOpen]);

//   return (
//     <RBSheet
//       ref={refRBSheet}
//       height={520}
//       openDuration={250}
//       closeOnDragDown={true}
//       draggable={true}
//       onClose={() => setIsOpen(false)}
//       customStyles={{
//         container: styles.sheetContainer,
//         wrapper: styles.wrapper,
//         draggableIcon: {backgroundColor: '#444'},
//       }}>
//       <View style={styles.inner}>
//         <View style={styles.headerRow}>
//           <Text style={styles.headerTitle}>Stream to Other Platforms</Text>
//           <TouchableOpacity
//             onPress={() => setIsOpen(false)}
//             style={styles.closeButton}>
//             <Text style={styles.closeText}>×</Text>
//           </TouchableOpacity>
//         </View>

//         <ScrollView
//           style={styles.scroll}
//           contentContainerStyle={{paddingBottom: 24}}
//           showsVerticalScrollIndicator={false}>

//           {/* YouTube Card */}
//           <View style={styles.card}>
//             <View style={styles.cardRow}>
//               <View style={styles.iconWrapperYouTube}>
//                 <Text style={styles.iconText}>▶</Text>
//               </View>
//               <View style={{flex: 1, marginLeft: 12}}>
//                 <Text style={styles.cardTitle}>YouTube</Text>
//                 <Text style={styles.cardSubtitleRed}>Streaming Live</Text>
//               </View>
//               <View style={{alignItems: 'flex-end'}}>
//                 <Text style={styles.enableLabel}>Enable streaming</Text>
//                 <ToggleSwitch
//                   isOn={youtubeEnabled}
//                   onColor="#ff4444"
//                   offColor="#666"
//                   size="medium"
//                   onToggle={isOn => setYoutubeEnabled(isOn)}
//                 />
//               </View>
//             </View>
//             <TouchableOpacity style={styles.redButton}>
//             <Text style={styles.purpleButtonText}>Connect</Text>
//             </TouchableOpacity>
//           </View>

//           {/* Instagram Card */}
//           <View style={styles.card}>
//             <View style={styles.cardRow}>
//               <View style={styles.iconWrapperInstagram}>
//                 <Text style={styles.iconText}>✦</Text>
//               </View>
//               <View style={{flex: 1, marginLeft: 12}}>
//                 <Text style={styles.cardTitle}>Instagram</Text>
//                 <Text style={styles.cardSubtitleGreen}>Not Connected</Text>
//                 <TextInput
//                   placeholder="Paste Instagram Stream Key/URL"
//                   placeholderTextColor="#8b8b8b"
//                   value={instagramKey}
//                   onChangeText={setInstagramKey}
//                   style={styles.input}
//                 />
//                 <TouchableOpacity style={styles.purpleButton}>
//                   <Text style={styles.purpleButtonText}>Save & Connect</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </View>

//           {/* Facebook Card */}
//           <View style={styles.card}>
//             <View style={styles.cardRow}>
//               <View style={styles.iconWrapperFacebook}>
//                 <Text style={styles.iconText}>f</Text>
//               </View>
//               <View style={{flex: 1, marginLeft: 12}}>
//                 <Text style={styles.cardTitle}>Facebook</Text>
//                 <Text style={styles.cardSubtitleGreen}>Not Connected</Text>
//                 <TouchableOpacity style={styles.blueButton}>
//                   <Text style={styles.blueButtonText}>Connect</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </View>

//         </ScrollView>
//       </View>
//     </RBSheet>
//   );
// }

// const styles = StyleSheet.create({
//   wrapper: {backgroundColor: 'rgba(0,0,0,0.5)'},
//   sheetContainer: {
//     backgroundColor: '#1f1f1f',
//     borderTopLeftRadius: 16,
//     borderTopRightRadius: 16,
//     paddingTop: 12,
//     paddingHorizontal: 16,
//   },
//   inner: {
//     flex: 1,
//   },
//   headerRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: 12,
//   },
//   headerTitle: {
//     fontSize: 18,
//     color: '#fff',
//     fontWeight: '700',
//     textAlign: 'center',
//   },
//   closeButton: {
//     position: 'absolute',
//     right: 8,
//     top: -10,
//     padding: 8,
//   },
//   closeText: {fontSize: 22, color: '#cfcfcf'},
//   scroll: {
//     marginTop: 6,
//   },
//   card: {
//     backgroundColor: '#2b2b2b',
//     borderRadius: 12,
//     padding: 14,
//     marginBottom: 14,
//     minHeight: 86,
//     justifyContent: 'center',
//   },
//   cardRow: {flexDirection: 'row', alignItems: 'center'},
//   iconWrapperYouTube: {
//     width: 48,
//     height: 48,
//     borderRadius: 10,
//     backgroundColor: '#000',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   iconWrapperInstagram: {
//     width: 48,
//     height: 48,
//     borderRadius: 10,
//     backgroundColor: '#2d2d2d',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   iconWrapperFacebook: {
//     width: 48,
//     height: 48,
//     borderRadius: 10,
//     backgroundColor: '#2a2a2a',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   iconText: {color: '#fff', fontWeight: '700', fontSize: 18},
//   cardTitle: {color: '#fff', fontSize: 16, fontWeight: '700'},
//   cardSubtitleRed: {color: '#ff6666', marginTop: 4},
//   cardSubtitleGreen: {color: '#3cd278', marginTop: 4},
//   enableLabel: {color: '#bdbdbd', marginBottom: 6, textAlign: 'right'},
//   input: {
//     borderRadius: 8,
//     backgroundColor: '#222',
//     paddingVertical: 8,
//     paddingHorizontal: 10,
//     marginTop: 8,
//     color: '#fff',
//   },
//   purpleButton: {
//     marginTop: 10,
//     backgroundColor: '#5b2e86',
//     paddingVertical: 10,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//    redButton: {
//     alignSelf: 'flex-end',
//     width: '82%',
//     marginTop: 10,
//     backgroundColor: 'red',
//     paddingVertical: 10,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   purpleButtonText: {color: '#fff', fontWeight: '700'},
//   blueButton: {
//     marginTop: 10,
//     backgroundColor: '#2b8cff',
//     paddingVertical: 10,
//     borderRadius: 8,
//     alignItems: 'center',
//     width: 140,
//   },
//   blueButtonText: {color: '#fff', fontWeight: '700'},
// });
