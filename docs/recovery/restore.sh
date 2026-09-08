NAMESPACE="employee-management-app"
POD="mongo-6497474fd6-s7jm2"
BACKUP_FILE="<paste-exact-filename-here>.tar.gz"
BACKUP_DIR=$(basename $BACKUP_FILE .tar.gz)

aws s3 cp s3://maadhav-mongo-backups/$BACKUP_FILE ./$BACKUP_FILE
tar -xzf $BACKUP_FILE

kubectl cp ./$BACKUP_DIR $NAMESPACE/$POD:/tmp/$BACKUP_DIR

kubectl exec -n $NAMESPACE $POD -- sh -c \
  "mongorestore --username=\$MONGO_INITDB_ROOT_USERNAME --password=\$MONGO_INITDB_ROOT_PASSWORD --authenticationDatabase=admin --drop /tmp/$BACKUP_DIR"

rm -rf $BACKUP_FILE $BACKUP_DIR
kubectl exec -n $NAMESPACE $POD -- rm -rf /tmp/$BACKUP_DIR

echo "Restore complete."