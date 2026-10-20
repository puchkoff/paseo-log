Adds a Log item to the sidebar. Agents write short messages to it and you read them there, newest first.

Every agent created after the plugin is installed gets three tools: `log` (title, message, level: info, success, warning or error), `read_log` (latest entries, newest first, each with an id) and `delete_log` (remove entries by id, no undo). Tell an agent to "log it" when you want a result, blocker or decision waiting for you later. Each entry shows the time, the agent's working folder and a link back to the agent. The screen refreshes every few seconds.

Entries live in `~/.paseo-log/log.jsonl` of the OS user running the daemon, so each daemon has its own log. Agents that already existed before installation do not have the tool until they are recreated.
