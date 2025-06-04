# VITE react-ts project template
Under the `./template` folder in the project are all the files to be replaced with inside the project to have a structured fresh start for react-ts app.

You can either copy paste the files or run the [`init.js`](https://github.com/matija-radovic/f-test/blob/main/init.js) script to do all the manual work.


## Script info
To run a script without downloading you can do:
```powershell
# download a script
$url = "https://raw.githubusercontent.com/matija-radovic/vite-react-ts-template/main/init.js"
$script = (Invoke-WebRequest -Uri $url -UseBasicParsing).Content
$tempFile = [System.IO.Path]::GetTempFileName() + ".js"
Set-Content -Path $tempFile -Value $script

# run a script
node $tempFile

# cleanup
Remove-Item $tempFile
```
Script has 4 arguments:
1. **project name** - requires no flag, default is `"my-app"`
2. **github** - specifies where should the script look for template repo, default is this repo.
3. **branch** - specifies what branch should the script look at, default main.
4. **templatePath** - specifies where should the script look at for the template folder, default is root, if `--github` is default and user didn't enter anything or specify the `--templatePath` arg, the path is `./template` to match this repo.

For example:
```powershell
node init.js "<project-name>" `
    --github "https://github.com/<username>/<repo>" `
    --branch "<branch-name>" `
    --templatePath "<path-to-template-folder>" 
```
