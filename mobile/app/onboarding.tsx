import React, { useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import CareIllustration, { CareScene } from '@/components/welcome/CareIllustration';
import { Action, Brand, Entrance, welcome as c } from '@/components/welcome/WelcomeUI';

const slides: { id: CareScene; tag: string; title: string; description: string; note: string }[] = [
  { id: 'records', tag: 'YOUR HEALTH, TOGETHER', title: 'A little more\npeace of mind.', description: 'Your records, results, and vitals. In one place, wherever life takes you.', note: 'Your health story. Always with you.' },
  { id: 'telecare', tag: 'CARE THAT COMES TO YOU', title: 'Closer to care.\nWherever you are.', description: 'Connect with a clinician through TeleCare, without the trip to the waiting room.', note: 'Real conversations. Personal care.' },
  { id: 'dispatch', tag: 'SUPPORT WHEN IT MATTERS', title: 'A helping hand.\nWhen you need it.', description: 'Request emergency support and share your location with the response team.', note: 'Connected to support, every step.' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const list = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(844);
  const compact = height < 700;
  const artHeight = compact ? Math.max(130, Math.min(210, height - 410)) : Math.min(300, width * 330 / 360);
  const goTo = (next: number) => { setIndex(next); list.current?.scrollToOffset({ offset: next * width, animated: true }); };

  return <SafeAreaView style={styles.screen}>
    <StatusBar barStyle="dark-content" backgroundColor={c.paper} />
    <View style={styles.frame} onLayout={event => {
      const nextWidth = event.nativeEvent.layout.width;
      setHeight(event.nativeEvent.layout.height);
      if (nextWidth !== width) { setWidth(nextWidth); list.current?.scrollToOffset({ offset: index * nextWidth, animated: false }); }
    }}>
      <View style={[styles.header, compact && { paddingTop: 6 }]}>
        <Brand />
        <Pressable accessibilityRole="button" onPress={() => router.push('/signup')} style={styles.skip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
      <View style={[styles.progress, compact && { marginTop: 8, marginBottom: 4 }]} accessibilityLabel={`Introduction ${index + 1} of ${slides.length}`}>
        {slides.map((slide, i) => <Pressable key={slide.id} accessibilityRole="button"
          accessibilityLabel={`Go to introduction ${i + 1}`} accessibilityState={{ selected: index === i }}
          onPress={() => goTo(i)} style={styles.progressTouch}>
          <View style={[styles.segment, { backgroundColor: i <= index ? c.green : c.line }]} />
        </Pressable>)}
        <Text style={styles.count}>0{index + 1} / 03</Text>
      </View>
      {width > 0 && <FlatList key={width} ref={list} data={slides} horizontal pagingEnabled
        initialScrollIndex={index} showsHorizontalScrollIndicator={false} style={styles.carousel}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={item => item.id} extraData={width}
        onMomentumScrollEnd={event => setIndex(Math.max(0, Math.min(2, Math.round(event.nativeEvent.contentOffset.x / width))))}
        renderItem={({ item }) => <ScrollView style={{ width }} contentContainerStyle={styles.slide} showsVerticalScrollIndicator={false}>
          <View style={styles.copy}>
            <Text style={[styles.tag, compact && { marginBottom: 12 }]}>{item.tag}</Text>
            <Text style={[styles.title, compact && { fontSize: 34, lineHeight: 38, marginBottom: 12 }]} accessibilityRole="header">{item.title}</Text>
            <Text style={[styles.description, compact && { fontSize: 14, lineHeight: 21 }]}>{item.description}</Text>
          </View>
          <View style={[styles.art, { height: artHeight }]}><CareIllustration scene={item.id} /></View>
          <Text style={styles.note}>{item.note}</Text>
        </ScrollView>} />}
      <Entrance style={styles.footer}>
        <Action label={index === 2 ? 'Create my account' : 'Continue'} onPress={() => index === 2 ? router.push('/signup') : goTo(index + 1)} />
        <Pressable accessibilityRole="button" onPress={() => router.push('/login')} style={styles.signIn}>
          <Text style={styles.signInText}>Already have an account? <Text style={styles.link}>Sign in</Text></Text>
        </Pressable>
      </Entrance>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.paper },
  frame: { flex: 1, width: '100%', maxWidth: 540, alignSelf: 'center' },
  header: { paddingHorizontal: 28, paddingTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skip: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  skipText: { color: c.muted, fontSize: 14 },
  progress: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, gap: 6, marginTop: 18, marginBottom: 12 },
  progressTouch: { flex: 1, minHeight: 24, justifyContent: 'center' },
  segment: { height: 3, borderRadius: 3 },
  count: { color: c.muted, fontSize: 10, letterSpacing: 1, marginLeft: 12 },
  carousel: { flex: 1 },
  slide: { flexGrow: 1, paddingTop: 12, paddingBottom: 12, justifyContent: 'space-between' },
  copy: { paddingHorizontal: 28 },
  tag: { color: c.green, fontSize: 10, letterSpacing: 1.8, fontWeight: '700', marginBottom: 16 },
  title: { color: c.ink, fontSize: 43, lineHeight: 48, fontWeight: '500', fontStyle: 'italic', letterSpacing: -2, marginBottom: 18 },
  description: { color: c.muted, fontSize: 15, lineHeight: 23, maxWidth: 340 },
  art: { width: '100%', maxWidth: 420, alignSelf: 'center', marginTop: 8 },
  note: { textAlign: 'center', color: c.muted, fontSize: 11, letterSpacing: 0.3, marginHorizontal: 28, marginTop: 6 },
  footer: { paddingHorizontal: 28, paddingTop: 14, paddingBottom: 10 },
  signIn: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  signInText: { color: c.muted, fontSize: 13 },
  link: { color: c.ink, fontWeight: '700' },
});
