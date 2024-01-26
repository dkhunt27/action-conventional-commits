import get from "lodash.get";
import got from "got";
import { getOctokit } from '@actions/github'

type Commit = {
    message: string;
};

const extractCommits = async (context, core): Promise<Commit[]> => {

    core.info(`context.payload.commits: ${JSON.stringify(context.payload.commits, null, 2)}\n`);
    core.info(`context.payload.pull_request: ${JSON.stringify(context.payload.pull_request, null, 2)}\n`);

    // For "push" events, commits can be found in the "context.payload.commits".
    const pushCommits = Array.isArray(get(context, "payload.commits"));
    if (pushCommits) {
        core.info(`detected a "push"; using those commits`);
        return context.payload.commits;
    }

    const pull_request = get(context, "payload.pull_request");
    if (!pull_request) {
        core.warnMsg("Push or Pull Request not detected; no commits to check");
        
    }   else {
        if (core.getInput('use-pr-number') == "true") {
            // For PRs, we need to get a list of commits via the GH API:
            const prNumber = get(pull_request, "number");
            core.info(`PR Number: ${prNumber}`);
            if (prNumber) {
                try {
    
                    if (core.getInput('github-token') === "") {
                        const errMsg = "github-token is required when USE_PR_NUMBER is true"
                        core.setFailed(errMsg);
                        throw new Error(errMsg)
                    } 
    
                    let token = core.getInput('github-token')
                    const github = getOctokit(token).rest
                    const params = {
                        owner: context.repo.owner,
                        repo: context.repo.repo,
                        pull_number: prNumber
                    }
                    const { data } = await github.pulls.listCommits(params);
                    core.info(`Commits extracted: ${data.length}`);
        
                    if (Array.isArray(data)) {
                        return data.map((item) => item.commit);
                    }
                    return [];
                } catch {
                    return [];
                }
            }
        } else {
            // For PRs, we need to get a list of commits via the GH API:
            const prCommitsUrl = get(pull_request, "commits_url");
            core.info(`PR Url: ${prCommitsUrl}`);
            if (prCommitsUrl) {
                try {
                    let requestHeaders = {
                        "Accept": "application/vnd.github+json",
                    }
                    if (core.getInput('github-token') != "") {
                        requestHeaders["Authorization"] = "token " + core.getInput('github-token')
                    } 
                    const { body } = await got.get(prCommitsUrl, {
                        responseType: "json",
                        headers: requestHeaders,
                    });
    
                    core.info(`body extracted: ${JSON.stringify(body)}`);
                    core.info(`Commits extracted: ${(body as any)?.length}`);
                    if (Array.isArray(body)) {
                        return body.map((item) => item.commit);
                    }
                    return [];
                } catch {
                    return [];
                }
            }
        }
    }


    return [];
};

export default extractCommits;
