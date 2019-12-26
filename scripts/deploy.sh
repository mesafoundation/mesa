read -p "Have you bumped the version in ./src? " -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
    yarn build
    cd dist
    yarn publish --access public
fi