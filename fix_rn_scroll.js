const fs = require('fs');

const file = 'RepairShopApp/src/components/jobs/JobList.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace Priority Chips ScrollView
content = content.replace(
  /\{\/\* Priority chips \*\/\}\s*\{showPriorityFilter && priorityTabs && activePriorityTab && onPriorityTabChange && \(\s*<ScrollView horizontal showsHorizontalScrollIndicator=\{false\} style=\{styles\.chipsScroll\} contentContainerStyle=\{styles\.chipsContent\}>\s*\{priorityTabs\.map\(tab => \(\s*<AppPressable[\s\S]*?<\/AppPressable>\s*\)\)\}\s*<\/ScrollView>\s*\)\}/,
  `{/* Priority chips */}
        {showPriorityFilter && priorityTabs && activePriorityTab && onPriorityTabChange && (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsContent}
            data={priorityTabs}
            keyExtractor={tab => tab.value}
            renderItem={({ item: tab }) => (
              <AppPressable
                style={[styles.chip, activePriorityTab === tab.value && styles.chipActive]}
                onPress={() => onPriorityTabChange(tab.value)}
              >
                <Text style={[styles.chipText, activePriorityTab === tab.value && styles.chipTextActive]}>
                  {tab.label} {tab.count !== undefined ? \`(\${tab.count})\` : ''}
                </Text>
              </AppPressable>
            )}
          />
        )}`
);

// Replace Status Chips ScrollView
content = content.replace(
  /\{\/\* Status chips \*\/\}\s*<ScrollView horizontal showsHorizontalScrollIndicator=\{false\} style=\{styles\.chipsScroll\} contentContainerStyle=\{styles\.chipsContent\}>\s*\{statusTabs\.map\(tab => \(\s*<AppPressable[\s\S]*?<\/AppPressable>\s*\)\)\}\s*<\/ScrollView>/,
  `{/* Status chips */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
          data={statusTabs}
          keyExtractor={tab => tab.value}
          renderItem={({ item: tab }) => (
            <AppPressable
              style={[styles.chip, activeStatusTab === tab.value && styles.chipActive]}
              onPress={() => onStatusTabChange(tab.value)}
            >
              <Text style={[styles.chipText, activeStatusTab === tab.value && styles.chipTextActive]}>
                {tab.label} {tab.count !== undefined ? \`(\${tab.count})\` : ''}
              </Text>
            </AppPressable>
          )}
        />`
);

// Replace Skeletons ScrollView
content = content.replace(
  /<ScrollView contentContainerStyle=\{\[styles\.listContent, \{ paddingBottom: bottomPadding \}\]\}>\s*\{\[0, 1, 2, 3\]\.map\(i => <SkeletonCard key=\{i\} \/>\)\}\s*<\/ScrollView>/,
  `<FlatList
          data={[0, 1, 2, 3]}
          keyExtractor={i => i.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
          renderItem={() => <SkeletonCard />}
        />`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed JobList.tsx');
