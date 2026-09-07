NAMESPACE="employee-management-app"
POD="<paste-pod-name-here>"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="mongo-backup-$TIMESTAMP"

echo "Backing up from Pod: $POD"

kubectl exec -n $NAMESPACE $POD -- sh -c \
  "mongodump --username=\$MONGO_INITDB_ROOT_USERNAME --password=\$MONGO_INITDB_ROOT_PASSWORD --authenticationDatabase=admin --out=/tmp/$BACKUP_NAME"

kubectl cp $NAMESPACE/$POD:/tmp/$BACKUP_NAME ./$BACKUP_NAME

tar -czf $BACKUP_NAME.tar.gz $BACKUP_NAME
rm -rf $BACKUP_NAME

aws s3 cp $BACKUP_NAME.tar.gz s3://maadhav-mongo-backups/$BACKUP_NAME.tar.gz

rm $BACKUP_NAME.tar.gz
kubectl exec -n $NAMESPACE $POD -- rm -rf /tmp/$BACKUP_NAME

echo "Backup complete: s3://maadhav-mongo-backups/$BACKUP_NAME.tar.gz"