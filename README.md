# TFC

## Team Foundation Server automatic checkout executable

Automatically checking out TF files given a `git status` command output.

## How to use

Install:  
`npm i -g @wufe/tfc`

Use:
`tfc -m "Comment"`

## Requirements

The tf client must be installed.  
The folder must have a initialized git repository and must be under a tfs workspace.

## Steps

It will execute a git status, then the output will be used to automatically checkout those files with the tf client.