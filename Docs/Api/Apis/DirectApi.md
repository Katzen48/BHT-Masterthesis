# DirectApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**directReposGet**](DirectApi.md#directReposGet) | **GET** /direct/repos/ | 
[**directReposRepoIdCommitsGet**](DirectApi.md#directReposRepoIdCommitsGet) | **GET** /direct/repos/{repo_id}/commits | 
[**directReposRepoIdDeploymentsGet**](DirectApi.md#directReposRepoIdDeploymentsGet) | **GET** /direct/repos/{repo_id}/deployments | 
[**directReposRepoIdEnvironmentsGet**](DirectApi.md#directReposRepoIdEnvironmentsGet) | **GET** /direct/repos/{repo_id}/environments | 
[**directReposRepoIdGet**](DirectApi.md#directReposRepoIdGet) | **GET** /direct/repos/{repo_id} | 
[**directReposRepoIdIssuesGet**](DirectApi.md#directReposRepoIdIssuesGet) | **GET** /direct/repos/{repo_id}/issues | 
[**directReposRepoIdPullsGet**](DirectApi.md#directReposRepoIdPullsGet) | **GET** /direct/repos/{repo_id}/pulls | 


<a name="directReposGet"></a>
# **directReposGet**
> List directReposGet()



### Parameters
This endpoint does not need any parameter.

### Return type

[**List**](../\Models/Repository.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

<a name="directReposRepoIdCommitsGet"></a>
# **directReposRepoIdCommitsGet**
> Commit directReposRepoIdCommitsGet(repoId)



### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **repoId** | **String**|  | [default to null]

### Return type

[**Commit**](../\Models/Commit.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

<a name="directReposRepoIdDeploymentsGet"></a>
# **directReposRepoIdDeploymentsGet**
> Deployment directReposRepoIdDeploymentsGet(repoId)



### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **repoId** | **String**|  | [default to null]

### Return type

[**Deployment**](../\Models/Deployment.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

<a name="directReposRepoIdEnvironmentsGet"></a>
# **directReposRepoIdEnvironmentsGet**
> Environment directReposRepoIdEnvironmentsGet(repoId)



### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **repoId** | **String**|  | [default to null]

### Return type

[**Environment**](../\Models/Environment.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

<a name="directReposRepoIdGet"></a>
# **directReposRepoIdGet**
> Repository directReposRepoIdGet(repoId)



### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **repoId** | **String**|  | [default to null]

### Return type

[**Repository**](../\Models/Repository.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

<a name="directReposRepoIdIssuesGet"></a>
# **directReposRepoIdIssuesGet**
> Issue directReposRepoIdIssuesGet(repoId)



### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **repoId** | **String**|  | [default to null]

### Return type

[**Issue**](../\Models/Issue.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

<a name="directReposRepoIdPullsGet"></a>
# **directReposRepoIdPullsGet**
> PullRequest directReposRepoIdPullsGet(repoId)



### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **repoId** | **String**|  | [default to null]

### Return type

[**PullRequest**](../\Models/PullRequest.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

