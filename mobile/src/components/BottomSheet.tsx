import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Colors, BorderRadius, Spacing, Glass, Shadow } from '../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_VISIBLE = 420;
const HEADER_OFFSET = 60;
const SNAP_COLLAPSED = SCREEN_HEIGHT - COLLAPSED_VISIBLE;
const SNAP_EXPANDED = HEADER_OFFSET;

interface Props {
  children: React.ReactNode;
  style?: any;
  onSnap?: (index: number) => void;
}

export default function BottomSheet({ children, style, onSnap }: Props) {
  const topVal = useSharedValue(SNAP_COLLAPSED);
  const contextY = useSharedValue(SNAP_COLLAPSED);
  const snapMid = (SNAP_EXPANDED + SNAP_COLLAPSED) / 2;

  const gesture = Gesture.Pan()
    .onStart(() => { contextY.value = topVal.value; })
    .onUpdate((e) => {
      topVal.value = Math.max(
        SNAP_EXPANDED - 20,
        Math.min(SNAP_COLLAPSED + 20, contextY.value + e.translationY)
      );
    })
    .onEnd(() => {
      const goingDown = topVal.value > snapMid;
      const snap = goingDown ? SNAP_COLLAPSED : SNAP_EXPANDED;
      topVal.value = withSpring(snap, { damping: 20, stiffness: 150 });
      contextY.value = snap;
      if (onSnap) runOnJS(onSnap)(goingDown ? 1 : 0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    top: topVal.value,
  }));

  return (
    <Animated.View style={[styles.container, { height: SCREEN_HEIGHT }, animatedStyle, style]}>
      <GestureDetector gesture={gesture}>
        <View style={styles.handleHitArea}>
          <View style={styles.handle} />
        </View>
      </GestureDetector>
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: Glass.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.safeMargin,
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: Glass.sheetBorder,
    ...Shadow.sheet,
  },
  handleHitArea: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.outlineVariant,
  },
  content: {
    flex: 1,
  },
});
