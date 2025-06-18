# Planning Dashboard Estimation Status Testing Guide

## Prerequisites
- Application running on http://localhost:5174/
- Database with sample backlog items and planning sessions
- Multiple user sessions for voting testing

## Test Scenarios

### 1. Basic Estimation Status Display

#### Test 1.1: Unvoted Items Display
1. Navigate to Planning Dashboard
2. Create a new planning session
3. Drag backlog items to the session
4. **Expected**: Items should show gray circle indicator (no votes yet)
5. **Expected**: No vote count badges should appear

#### Test 1.2: Voted Items Display
1. Join a planning session with assigned items
2. Vote on several backlog items
3. Return to Planning Dashboard
4. **Expected**: Voted items show green checkmark
5. **Expected**: Vote count badges display correct number of votes

### 2. Session Cards Estimation Indicators

#### Test 2.1: Mixed Estimation Status
1. Create session with multiple items
2. Vote on some items, leave others unvoted
3. View session card on dashboard
4. **Expected**: 
   - Voted items: Green checkmark + vote count badge
   - Unvoted items: Gray circle
   - All items display priority and estimation status

#### Test 2.2: Tooltip Information
1. Hover over estimation status icons
2. **Expected**: Tooltips show "X vote(s)" or "No votes yet"

### 3. Session Preview Modal

#### Test 3.1: Enhanced Item Details
1. Click "Preview" on a session with voted items
2. **Expected**: Modal shows:
   - Estimation status icons for each item
   - Vote count badges for voted items
   - Unique vote values listed (e.g., "Votes: 3, 5, 8")

#### Test 3.2: Detailed Estimation Info
1. Vote on item with multiple different values (3, 5, 8)
2. Preview the session
3. **Expected**: Item shows "Votes: 3, 5, 8" under description

### 4. Real-time Updates

#### Test 4.1: Status Updates After Voting
1. Open dashboard in one browser tab
2. Join voting session in another tab
3. Submit votes and return to dashboard
4. **Expected**: Dashboard updates to show new vote counts

#### Test 4.2: Drag-and-Drop Preservation
1. Drag items between sessions
2. **Expected**: Estimation status preserved/updated correctly
3. **Expected**: Vote counts remain accurate

### 5. Edge Cases

#### Test 5.1: Empty Sessions
1. Create session with no items
2. **Expected**: No estimation indicators (no crashes)

#### Test 5.2: Session with All Items Voted
1. Create session where all items have votes
2. **Expected**: All items show green checkmarks and vote counts

#### Test 5.3: Session with No Votes
1. Create session with items but no votes
2. **Expected**: All items show gray circles, no vote badges

### 6. Multi-User Voting

#### Test 6.1: Multiple Participants
1. Have 3+ users vote on same item
2. Check dashboard display
3. **Expected**: Vote count reflects total participants

#### Test 6.2: Consensus Indication
1. Get multiple votes on same item
2. **Expected**: Vote count and unique values displayed correctly

### 7. Performance Testing

#### Test 7.1: Large Sessions
1. Create session with 10+ items
2. Mix of voted/unvoted items
3. **Expected**: Dashboard loads quickly, all indicators correct

#### Test 7.2: Multiple Sessions
1. Create 5+ sessions with various estimation states
2. **Expected**: All sessions show correct status indicators

## Validation Checklist

### Visual Elements
- [ ] Green checkmark for voted items
- [ ] Gray circle for unvoted items
- [ ] Vote count badges with correct numbers
- [ ] Tooltips show on hover
- [ ] Estimation details in preview modal

### Functionality
- [ ] Status updates after voting
- [ ] Drag-and-drop works correctly
- [ ] Session preview shows estimation info
- [ ] Real-time updates work
- [ ] No errors in console

### Data Accuracy
- [ ] Vote counts match actual votes
- [ ] Unique values display correctly
- [ ] Status indicators reflect true state
- [ ] Cross-session consistency

## Expected Behavior

### Session Card Display
```
[Session Name]
Started by: [User]

Assigned Items (3)
📋 Item 1 - High ✅ [2 votes]
📋 Item 2 - Medium ⚪
📋 Item 3 - Low ✅ [1 vote]
```

### Preview Modal Display
```
Item 1 - High ✅ [2 votes]
Description: Item description
Votes: 3, 5

Item 2 - Medium ⚪
Description: Item description
(No votes yet)
```

## Troubleshooting

### Common Issues
1. **Status not updating**: Check if `loadSessionsWithItems()` is called
2. **Wrong vote counts**: Verify database query in `getSessionEstimationStatus()`
3. **Missing icons**: Check if `getEstimationStatusIcon()` is called correctly
4. **Tooltips not showing**: Verify div wrapper with title attribute

### Debug Steps
1. Check browser console for errors
2. Verify network requests to database
3. Inspect component state in React DevTools
4. Test with different user roles

## Success Criteria
- ✅ Clear visual distinction between voted/unvoted items
- ✅ Accurate vote count display
- ✅ Enhanced session preview with estimation details
- ✅ Real-time updates after voting
- ✅ Preserved drag-and-drop functionality
- ✅ No performance degradation
