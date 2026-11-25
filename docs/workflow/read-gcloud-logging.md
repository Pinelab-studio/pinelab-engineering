---
name: read-gcloud-logging
description: Read application logs from deployed Pinelab services on Google Cloud (Gcloud).
---

Query Cloud Logging from the CLI using `gcloud logging read` to investigate deployed application behaviour and container crashes.

## Details needed before reading any logs

Always ask the user which project and log name to use:

- Ask which Google Cloud project to use. Run `gcloud projects list` to list available projects.
- After the project is confirmed, run `gcloud logging read --project=<project> --limit=100 --format=json | jq -r '.[].logName' | sort -u` to discover log names in recent logs, then ask which to query. If the list contains `winston_prod` or `winston_test`, show these at the top of the selection list because they are most used.

## Base command

Use this base command to fetch application logs for the selected log name:

```bash
gcloud logging read 'logName="projects/<project>/logs/<logname>"' --project=<project> --limit=50 --order=DESC --format='table[no-heading](timestamp, severity, labels.name, labels.module, jsonPayload.message:label=Message)'
```

Most application logs are in this log name, except crashes outside the Node.js process that are not logged by the application. Only omit the `logName="projects/<project>/logs/<logname>"` filter when investigating those failures; otherwise the results are usually too noisy.

Logs can be large. Limit results, filter by specific log labels, or restrict the timestamp range.

## Investigation flow

1. Search the codebase for messages the application can log. For Vendure, search for `Logger.*` calls such as `Logger.info(` and `Logger.error(`. Also search `node_modules` for Vendure and plugin logs: the relevant logging code is often in an installed dependency. For other applications, include `console.log` and other logging formats.
2. Use those messages for full-text searches:

   ```bash
   gcloud logging read 'logName="projects/<project>/logs/<logname>" AND "Some full text message"' --project=<project> --limit=50 --format='json(jsonPayload,labels,severity,timestamp)'
   ```

3. To retrieve surrounding logs, take the matching log's timestamp and query a window around it, replacing the message filter with concrete UTC timestamp bounds. For example, for a match at `2026-03-31T12:34:56Z`, search 30 seconds on either side:

   ```bash
   gcloud logging read 'logName="projects/<project>/logs/<logname>" AND timestamp >= "2026-03-31T12:34:26Z" AND timestamp <= "2026-03-31T12:35:26Z"' --project=<project> --limit=50 --order=ASC --format='json(jsonPayload,labels,severity,timestamp)'
   ```

4. Increase `--limit=<number>` or remove it to retrieve more logs in that time range, but be aware that this can produce a lot of output.

## Checking for OOM crashes and container-level errors

Application-level logs (winston) do not capture all container crashes, such as OOM kills. If the process appears to crash or restart (for example, repeated startup logs or jobs that never complete), check container-level logs by omitting the log-name filter and searching for crash signals:

```bash
gcloud logging read 'textPayload=~"memory" OR textPayload=~"kill" OR textPayload=~"OOM" OR textPayload=~"exit" OR textPayload=~"terminated"' --project=<project> --limit=50 --order=ASC --format='json(textPayload,jsonPayload,severity,timestamp)'
```

Signs of possible OOM or container crashes include:

- `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`
- `Uncaught signal: 6` (SIGABRT, which can be triggered by OOM)
- Repeated `The request failed because either the HTTP response was malformed or connection to the instance had an error` messages, which can indicate a container dying while handling requests
- Repeated "Connected to ..." or startup messages in application logs, which can indicate a restarting process

## Additional query filters

Append filters inside the quoted query, after the log-name filter. For example:

```bash
gcloud logging read 'logName="projects/<project>/logs/<logname>" severity>=WARNING' --project=<project> --limit=50 --order=DESC --format='json(jsonPayload,labels,severity,timestamp)'
```

Use `severity>=INFO`, `severity>=WARNING`, or `severity>=ERROR` to filter by severity.
