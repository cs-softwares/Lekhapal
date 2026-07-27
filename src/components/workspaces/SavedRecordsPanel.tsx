import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {COLORS} from '../../theme/colors';
import {WorkspaceRecord} from '../../types/workspace';
import {formatDateLabel} from '../../utils/workspaceFormatters';
import AppPressable from '../AppPressable';
import AppSectionTitle from '../AppSectionTitle';

type SavedRecordsPanelProps = {
  emptyBody: string;
  emptyTitle: string;
  loadLabel: string;
  onDelete: (recordId: string) => void;
  onLoad: (record: WorkspaceRecord) => void;
  onShare: (record: WorkspaceRecord) => void;
  records: WorkspaceRecord[];
  shareLabel: string;
  title: string;
};

const getVisibleLines = (record: WorkspaceRecord) => {
  if (record.toolId === 'village-diary') {
    const details = [
      ['Village', record.values.villageName],
      ['Tehsil', record.values.tehsil],
      ['District', record.values.district],
      ['Visit date', record.values.visitDate],
      ['Purpose', record.values.purpose],
      ['Field notes', record.values.notes],
      ['Pending work', record.values.pendingWork],
      ['Next step', record.values.nextStep],
    ];

    return details
      .filter(([, value]) => value?.trim())
      .map(([label, value]) => `${label}: ${value}`);
  }

  if (record.toolId === 'mutation-tracker') {
    const details = [
      ['Applicant', record.values.applicantName],
      ['Village', record.values.villageName],
      ['Khata reference', record.values.khataNumber],
      ['Case number', record.values.caseNumber],
      ['Status', record.values.status],
      ['Documents pending', record.values.documentsPending],
      ['Next action', record.values.nextAction],
      ['Remarks', record.values.remarks],
    ];

    return details
      .filter(([, value]) => value?.trim())
      .map(([label, value]) => `${label}: ${value}`);
  }

  return record.summaryLines;
};

const SavedRecordsPanel = ({
  emptyBody,
  emptyTitle,
  loadLabel,
  onDelete,
  onLoad,
  onShare,
  records,
  shareLabel,
  title,
}: SavedRecordsPanelProps) => {
  return (
    <View style={styles.wrapper}>
      <AppSectionTitle title={title} />

      {records.length ? (
        records.map(record => {
          const visibleLines = getVisibleLines(record);
          const isStructuredRecord =
            record.toolId === 'village-diary' ||
            record.toolId === 'mutation-tracker';

          return (
            <View
              key={record.id}
              style={styles.recordCard}>
              <View style={styles.recordTopRow}>
                <View style={styles.recordTopCopy}>
                  <Text style={styles.recordTitle}>
                    {record.title}
                  </Text>
                  {record.subtitle ? (
                    <Text style={styles.recordSubtitle}>
                      {record.subtitle}
                    </Text>
                  ) : null}
                  <Text style={styles.recordDate}>
                    {formatDateLabel(record.updatedAt)}
                  </Text>
                </View>

                <AppPressable
                  onPress={() => onDelete(record.id)}
                  style={styles.deleteButton}>
                  <Icon
                    color={COLORS.danger}
                    name="trash-can-outline"
                    size={18}
                  />
                </AppPressable>
              </View>

              {visibleLines.map((line, index) => {
                if (isStructuredRecord) {
                  const separatorIndex = line.indexOf(':');
                  const label =
                    separatorIndex >= 0
                      ? line.slice(0, separatorIndex)
                      : line;
                  const value =
                    separatorIndex >= 0
                      ? line
                          .slice(separatorIndex + 1)
                          .trim()
                      : '';

                  return (
                    <Text
                      key={`${record.id}-${label}-${index}`}
                      style={styles.recordLine}>
                      <Text style={styles.recordLineLabel}>
                        {label}
                        {value ? ': ' : ''}
                      </Text>
                      {value ? (
                        <Text style={styles.recordLineValue}>
                          {value}
                        </Text>
                      ) : null}
                    </Text>
                  );
                }

                return (
                  <Text
                    key={`${record.id}-${line}`}
                    style={styles.recordLine}>
                    {line}
                  </Text>
                );
              })}

              <View style={styles.recordActions}>
                <AppPressable
                  onPress={() => onLoad(record)}
                  style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>
                    {loadLabel}
                  </Text>
                </AppPressable>

                <AppPressable
                  onPress={() => onShare(record)}
                  style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>
                    {shareLabel}
                  </Text>
                </AppPressable>
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            {emptyTitle}
          </Text>
          <Text style={styles.emptyBody}>
            {emptyBody}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 12,
  },
  recordCard: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    marginBottom: 2,
    paddingVertical: 14,
  },
  recordTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recordTopCopy: {
    flex: 1,
    paddingRight: 10,
  },
  recordTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  recordSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  recordDate: {
    color: COLORS.textSoft,
    fontSize: 11,
    marginTop: 6,
  },
  deleteButton: {
    alignItems: 'center',
    borderRadius: 10,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  recordLine: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  recordLineLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  recordLineValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  recordActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionButton: {
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    paddingVertical: 14,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyBody: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
});

export default SavedRecordsPanel;
