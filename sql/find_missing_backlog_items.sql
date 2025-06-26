-- Delete all orphaned session_items (no matching backlog_items)
DELETE FROM session_items si
USING backlog_items bi
WHERE si.item_id::uuid = bi.id
  AND bi.id IS NULL;

-- If you want to just find the orphaned item_ids (not delete), use:
-- SELECT si.item_id FROM session_items si LEFT JOIN backlog_items bi ON si.item_id::uuid = bi.id WHERE bi.id IS NULL;
