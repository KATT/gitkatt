# GitHub history art

Paint some sweet art in your GitHub commit history.

## [Example](https://github.com/KATT)

<img src="./screenshot.png">

## HOW?!? 😻

1. [Create a personal API token](https://github.com/settings/tokens) 
1. Run
   ```sh
   npx gitkatt
   ```
1. (Optional): Update `./art` with other art
1. Follow the rest of steps


### Custom art


A file called `./art` will be created automatically with a template.
  * any non-whitespace char gets filled
  * the canvas is 7 in height (7 days)

### Optional: set default options

```sh
export GITHUB_USER='YOUR_GITHUB_USER'
export GITHUB_API_TOKEN='YOUR_GITHUB_API_TOKEN'
export DRAW_START_DATE='2017-02-26'
export ART_FILENAME='art'
```

### Notes

- Every time you run it it will delete (clears the graph) and create a repo called `gitkatt-child-repo` ([Example repo](https://github.com/KATT/gitkatt-child-repo)).
- The more layers you choose, the longer it'll run, & the darker your dots become. 

