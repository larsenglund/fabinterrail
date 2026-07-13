/**
 * Ask: chat with a travel expert grounded in the curated Interrail knowledge
 * base + your live trip context. Works offline via the local knowledge base;
 * an Anthropic API key (stored on device) enables full AI answers.
 */

import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button, Dim, Header, Input, TextAction } from '../components/ui';
import { askAssistant } from '../services/assistant';
import { useActiveTrip, useAppStore } from '../store/appStore';
import { radii, spacing, usePalette } from '../theme';

const SUGGESTIONS = [
  'Do night trains use up two travel days?',
  'Where do I book passholder reservations in Sweden?',
  'Which countries require seat reservations?',
  'What daily budget should we plan for?',
];

export function AssistantScreen() {
  const p = usePalette();
  const chat = useAppStore((s) => s.chat);
  const apiKey = useAppStore((s) => s.anthropicApiKey);
  const { pushChat, clearChat, setAnthropicApiKey } = useAppStore();
  const trip = useActiveTrip();
  const travelers = useAppStore((s) => s.travelers);

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const send = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput('');
    pushChat({ role: 'user', content: q });
    setBusy(true);
    try {
      const answer = await askAssistant(q, { trip, travelers, apiKey });
      pushChat({ role: 'assistant', content: answer.text, sources: answer.sources });
    } catch (e) {
      pushChat({
        role: 'assistant',
        content: `Sorry, that failed: ${e instanceof Error ? e.message : 'unknown error'}`,
      });
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        <Header
          kicker="Travel assistant"
          title="Ask"
          sub={
            apiKey
              ? 'AI answers on · grounded in rail knowledge + your trip'
              : 'Offline knowledge base · add an API key for AI answers'
          }
        />
        <TextAction
          title={showSettings ? 'Hide settings' : 'Settings'}
          onPress={() => setShowSettings(!showSettings)}
        />
        {showSettings && (
          <View style={{ marginTop: spacing.m }}>
            <Input
              label="Anthropic API key (stored on device)"
              value={keyInput}
              onChangeText={setKeyInput}
              placeholder={apiKey ? '••••••••  (key saved)' : 'sk-ant-…'}
              autoCapitalize="none"
              secureTextEntry
            />
            <Button
              title="Save key"
              disabled={!keyInput.trim()}
              onPress={() => {
                setAnthropicApiKey(keyInput.trim());
                setKeyInput('');
              }}
            />
            {apiKey ? (
              <Button title="Remove key" kind="ghost" onPress={() => setAnthropicApiKey(undefined)} />
            ) : null}
            <Button title="Clear chat" kind="ghost" onPress={clearChat} />
          </View>
        )}

        {chat.length === 0 && (
          <View style={{ marginTop: spacing.l }}>
            <Dim>Try one of these:</Dim>
            {SUGGESTIONS.map((s) => (
              <Pressable
                key={s}
                onPress={() => send(s)}
                style={({ pressed }) => [
                  styles.suggestion,
                  { borderColor: p.hair },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Text style={{ color: p.signalText, fontSize: 14, fontWeight: '600' }}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {chat.map((m) => {
          const isUser = m.role === 'user';
          return (
            <View
              key={m.id}
              style={[
                styles.bubble,
                isUser
                  ? { backgroundColor: p.ink, alignSelf: 'flex-end' }
                  : { backgroundColor: p.field, alignSelf: 'flex-start' },
              ]}
            >
              <Text style={{ color: isUser ? p.paper : p.ink, fontSize: 15, lineHeight: 21 }}>
                {m.content}
              </Text>
              {m.sources && m.sources.length > 0 && (
                <Text style={[styles.sources, { color: isUser ? p.paper : p.muted }]}>
                  Sources: {[...new Set(m.sources)].join(' · ')}
                </Text>
              )}
            </View>
          );
        })}
        {busy && <Dim>Thinking…</Dim>}
      </ScrollView>

      <View style={[styles.inputRow, { borderTopColor: p.hair, backgroundColor: p.paper }]}>
        <TextInput
          style={[styles.chatInput, { backgroundColor: p.field, borderColor: p.hair, color: p.ink }]}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about trains, passes, tickets…"
          placeholderTextColor={p.muted}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
        />
        <Button title="Send" onPress={() => send(input)} disabled={!input.trim()} loading={busy} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.l, paddingBottom: spacing.l },
  suggestion: {
    borderWidth: 1,
    borderRadius: radii.m,
    paddingVertical: 10,
    paddingHorizontal: spacing.m,
    marginTop: spacing.s,
  },
  bubble: {
    borderRadius: 14,
    padding: spacing.m,
    marginTop: spacing.s,
    maxWidth: '88%',
  },
  sources: { fontSize: 11, marginTop: spacing.s, opacity: 0.7 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.m,
    gap: spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chatInput: {
    flex: 1,
    borderRadius: radii.m,
    borderWidth: 1,
    paddingHorizontal: spacing.m,
    paddingVertical: 10,
    fontSize: 15,
  },
});
