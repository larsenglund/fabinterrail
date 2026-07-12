/**
 * Assistant tab: chat with a travel expert grounded in the curated Interrail
 * knowledge base + your live trip context. Works offline via the local
 * knowledge base; add an Anthropic API key for full AI answers.
 */

import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button, Card, Dim, Input, SectionTitle } from '../components/ui';
import { askAssistant } from '../services/assistant';
import { useActiveTrip, useAppStore } from '../store/appStore';
import { colors, spacing } from '../theme';

const SUGGESTIONS = [
  'Do night trains use up two travel days?',
  'Where do I book passholder reservations in Sweden?',
  'Which countries require seat reservations?',
  'What daily budget should we plan for?',
];

export function AssistantScreen() {
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
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: spacing.l, paddingBottom: spacing.l }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        <Card>
          <SectionTitle>Travel assistant</SectionTitle>
          <Dim>
            Answers about passes, reservations, night trains and budgets — grounded in a curated
            knowledge base ({apiKey ? 'AI answers enabled' : 'offline mode — add an API key for AI answers'})
            and your trip.
          </Dim>
          <Button
            title={showSettings ? 'Hide settings' : 'Assistant settings'}
            kind="ghost"
            onPress={() => setShowSettings(!showSettings)}
          />
          {showSettings && (
            <View>
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
        </Card>

        {chat.length === 0 && (
          <View>
            <Dim>Try one of these:</Dim>
            {SUGGESTIONS.map((s) => (
              <Button key={s} title={s} kind="ghost" onPress={() => send(s)} />
            ))}
          </View>
        )}

        {chat.map((m) => (
          <View
            key={m.id}
            style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.assistantBubble]}
          >
            <Text style={styles.bubbleText}>{m.content}</Text>
            {m.sources && m.sources.length > 0 && (
              <Text style={styles.sources}>Sources: {[...new Set(m.sources)].join(' · ')}</Text>
            )}
          </View>
        ))}
        {busy && <Dim>Thinking…</Dim>}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.chatInput}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about trains, passes, tickets…"
          placeholderTextColor={colors.textDim}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
        />
        <Button title="Send" onPress={() => send(input)} disabled={!input.trim()} loading={busy} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  bubble: {
    borderRadius: 14,
    padding: spacing.m,
    marginBottom: spacing.s,
    maxWidth: '90%',
  },
  userBubble: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
  assistantBubble: { backgroundColor: colors.card, alignSelf: 'flex-start' },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  sources: { color: colors.textDim, fontSize: 11, marginTop: spacing.s },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.m,
    gap: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.cardAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.m,
    paddingVertical: 10,
    fontSize: 15,
  },
});
