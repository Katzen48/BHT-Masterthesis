# Documentation for Adapter API

<a name="documentation-for-api-endpoints"></a>
## Documentation for API Endpoints

All URIs are relative to *http://localhost*

Class | Method | HTTP request | Description
------------ | ------------- | ------------- | -------------
*DirectApi* | [**directReposGet**](Apis/DirectApi.md#directreposget) | **GET** /direct/repos/ | 
*DirectApi* | [**directReposRepoIdCommitsGet**](Apis/DirectApi.md#directreposrepoidcommitsget) | **GET** /direct/repos/{repo_id}/commits | 
*DirectApi* | [**directReposRepoIdDeploymentsGet**](Apis/DirectApi.md#directreposrepoiddeploymentsget) | **GET** /direct/repos/{repo_id}/deployments | 
*DirectApi* | [**directReposRepoIdEnvironmentsGet**](Apis/DirectApi.md#directreposrepoidenvironmentsget) | **GET** /direct/repos/{repo_id}/environments | 
*DirectApi* | [**directReposRepoIdGet**](Apis/DirectApi.md#directreposrepoidget) | **GET** /direct/repos/{repo_id} | 
*DirectApi* | [**directReposRepoIdIssuesGet**](Apis/DirectApi.md#directreposrepoidissuesget) | **GET** /direct/repos/{repo_id}/issues | 
*DirectApi* | [**directReposRepoIdPullsGet**](Apis/DirectApi.md#directreposrepoidpullsget) | **GET** /direct/repos/{repo_id}/pulls | 


<a name="documentation-for-models"></a>
## Documentation for Models

 - [Commit](./\Models/Commit.md)
 - [Deployment](./\Models/Deployment.md)
 - [Environment](./\Models/Environment.md)
 - [Issue](./\Models/Issue.md)
 - [IssueAllOf](./\Models/IssueAllOf.md)
 - [PullRequest](./\Models/PullRequest.md)
 - [PullRequestAllOf](./\Models/PullRequestAllOf.md)
 - [PullRequestAllOfHead](./\Models/PullRequestAllOfHead.md)
 - [Repository](./\Models/Repository.md)
 - [WorkItem](./\Models/WorkItem.md)


<a name="documentation-for-authorization"></a>
## Documentation for Authorization

All endpoints do not require authorization.
